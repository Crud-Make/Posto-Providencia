// [11/01 17:00] Refatoração para padrão Senior: JSDoc, tratamento de erros e tipagem
import { useRef, useState } from 'react';
import { compraService, tanqueService } from '../../../services/api';
import { descreverErroDaApi } from '../../../services/api/base';
import { gravarRegistroDeComprasNaApi, registroDeComprasDeclarado, registroDeComprasPelaApi } from '../../../services/api/compras.api';
import { CombustivelHibrido } from './useCombustiveisHibridos';
import { montarRegistroDeCompras } from './montarRegistroDeCompras';
import { parseBRFloat } from '../../../utils/formatters';
import { isSuccess, ErrorResponse } from '../../../types/ui/response-types';

type CalcEstoqueHoje = (c: CombustivelHibrido) => number;

/**
 * O "Salvar" pela API Laravel (#103): um `POST /compras` com todos os combustíveis, gravado numa
 * transação no servidor. A chave de idempotência vale para a TENTATIVA: clicar de novo com os
 * mesmos números reusa a chave (o servidor devolve o já gravado, sem somar o estoque duas vezes);
 * mudar qualquer número, ou salvar com sucesso, gera outra.
 *
 * @returns `true` quando gravou.
 */
async function salvarPelaApi(
    postoId: number,
    tentativa: { current: { assinatura: string; chave: string } | null },
    corpoSemChave: ReturnType<typeof montarRegistroDeCompras>,
): Promise<boolean> {
    const assinatura = JSON.stringify(corpoSemChave);
    const chave = tentativa.current?.assinatura === assinatura ? tentativa.current.chave : crypto.randomUUID();
    tentativa.current = { assinatura, chave };

    const corpo = registroDeComprasDeclarado.safeParse({ chave, ...corpoSemChave });
    if (!corpo.success) {
        console.error('[Compras] Corpo fora do contrato da API:', corpo.error.message);
        alert('Erro ao salvar as informações: há um valor fora do formato esperado.');
        return false;
    }

    const gravado = await gravarRegistroDeComprasNaApi(postoId, corpo.data);
    if (gravado.isErr()) {
        console.error('[Compras] Falha ao salvar pela API:', gravado.error);
        alert(`Erro ao salvar as informações. ${descreverErroDaApi(gravado.error)}`);
        return false;
    }

    tentativa.current = null;
    return true;
}

/**
 * Hook responsável pela persistência dos dados de registro de compras e estoque.
 * 
 * @param postoAtivoId - ID do posto ativo no contexto.
 * @param onSuccess - Callback executado após o salvamento bem-sucedido.
 * @returns Objeto contendo estado de salvamento e função para salvar.
 */
export const usePersistenciaRegistro = (
    postoAtivoId: number | null,
    onSuccess: () => Promise<void>
) => {
    const [saving, setSaving] = useState(false);
    const tentativa = useRef<{ assinatura: string; chave: string } | null>(null);

    // Helper para consistência de parse
    const parseValue = parseBRFloat;

    /**
     * Salva as movimentações de compra e atualiza o histórico de estoque.
     * 
     * @param combustiveis - Lista de combustíveis com dados de compra e medição.
     * @param calcEstoqueHoje - Função para calcular o estoque escritural atual.
     * @param fornecedorId - ID do fornecedor selecionado (obrigatório se houver compras).
     * @param dataCompra - Data ISO (`aaaa-mm-dd`) da compra e da régua: hoje no mês corrente, o último dia do mês em mês passado.
     */
    const salvarDados = async (
        combustiveis: CombustivelHibrido[],
        calcEstoqueHoje: CalcEstoqueHoje,
        fornecedorId: number | null,
        dataCompra: string
    ) => {
        if (!postoAtivoId) {
            console.warn('[Compras] Posto ativo ID não definido');
            return;
        }

        try {
            setSaving(true);
            const hoje = dataCompra;

            // [25/01 Debug] Log dos valores recebidos
            console.log('[Compras] Iniciando salvamento:', {
                postoAtivoId,
                fornecedorId,
                combustiveis: combustiveis.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    compra_lt: c.compra_lt,
                    compra_lt_parsed: parseValue(c.compra_lt),
                    compra_rs: c.compra_rs,
                    compra_rs_parsed: parseValue(c.compra_rs),
                    tanque_id: c.tanque_id
                }))
            });

            // 1. Validação: Se houver compras, fornecedor é obrigatório
            const temCompras = combustiveis.some(c => parseValue(c.compra_lt) > 0);
            console.log('[Compras] Tem compras a registrar:', temCompras);

            if (temCompras && !fornecedorId) {
                alert('Por favor, selecione um fornecedor para registrar as compras.');
                setSaving(false); // [25/01 Fix] Reset saving state on early return
                return;
            }

            if (!temCompras) {
                console.log('[Compras] Nenhuma compra para registrar (todos compra_lt = 0 ou vazio)');
            }

            // #103: pela API, uma requisição só, numa transação no servidor.
            if (registroDeComprasPelaApi()) {
                const corpo = montarRegistroDeCompras(combustiveis, calcEstoqueHoje, fornecedorId, dataCompra);
                if (await salvarPelaApi(postoAtivoId, tentativa, corpo)) {
                    alert('Movimentações salvas e estoque atualizado com sucesso!');
                    await onSuccess();
                }
                return;
            }

            // 2. Processamento por combustível
            for (const c of combustiveis) {
                const litrosCompra = parseValue(c.compra_lt);
                const valorTotal = parseValue(c.compra_rs);

                console.log(`[Compras] Processando ${c.nome}:`, { litrosCompra, valorTotal, fornecedorId });

                // 2.1 Registrar Compra (se houver)
                if (litrosCompra > 0 && fornecedorId) {
                    console.log(`[Compras] Registrando compra de ${c.nome}...`);
                    await registrarCompra(c, litrosCompra, valorTotal, fornecedorId, hoje, postoAtivoId);
                    console.log(`[Compras] ✅ Compra de ${c.nome} registrada com sucesso`);
                }

                // 2.2 Salvar Histórico de Tanque (se vinculado)
                if (c.tanque_id) {
                    const estoqueFisico = parseValue(c.estoque_tanque);
                    await tanqueService.saveHistory({
                        tanque_id: c.tanque_id,
                        data: hoje,
                        volume_livro: calcEstoqueHoje(c),
                        volume_fisico: estoqueFisico > 0 ? estoqueFisico : undefined
                    });
                }
            }

            alert('Movimentações salvas e estoque atualizado com sucesso!');
            await onSuccess();

        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar as informações. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Função auxiliar para registrar compra e atualizar custos/estoque
     */
    const registrarCompra = async (
        c: CombustivelHibrido,
        litrosCompra: number,
        valorTotal: number,
        fornecedorId: number,
        data: string,
        postoId: number
    ) => {
        // A. Criar registro de compra
        const payload = {
            combustivel_id: c.id,
            data,
            fornecedor_id: fornecedorId,
            quantidade_litros: litrosCompra,
            valor_total: valorTotal,
            custo_por_litro: litrosCompra > 0 ? valorTotal / litrosCompra : 0,
            observacoes: `Atualização de estoque via Painel`,
            posto_id: postoId
        };

        console.log('[Compras] Payload para compraService.create:', payload);

        const result = await compraService.create(payload);

        if (!isSuccess(result)) {
            const errorMsg = (result as ErrorResponse).error;
            console.error('[Compras] ❌ Erro ao criar compra:', errorMsg);
            throw new Error(errorMsg || 'Erro ao criar compra');
        }

        console.log('[Compras] Compra criada no banco:', result.data);

        // B. Atualizar estoque atual do tanque
        if (c.tanque_id) {
            console.log(`[Compras] Atualizando estoque do tanque ${c.tanque_id} (+${litrosCompra}L)`);
            await tanqueService.updateStock(c.tanque_id, litrosCompra);
        }

    };


    return {
        saving,
        salvarDados
    };
};
