import { useState } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { USUARIO_SISTEMA_ID } from '@shared/constants/usuario-sistema';
import {
   fechamentoService,
   leituraService,
   fechamentoFrentistaService,
   recebimentoService
} from '../../../services/api';
import { parseValue } from '../../../utils/formatters';
import { isSuccess } from '../../../types/ui/response-types';
import type { BicoComDetalhes, SessaoFrentista, EntradaPagamento } from '../../../types/fechamento';
import { conferido, diferenca as calcularDiferenca } from '@posto/utils';
import { meiosDaSessao } from '../../../utils/fechamentoMeios';

interface SubmissaoParams {
   selectedDate: string;
   selectedTurno: number | null;
   bicos: BicoComDetalhes[];
   leituras: Record<number, { inicial: string; fechamento: string }>;
   sessoesFrentistas: SessaoFrentista[];
   payments: EntradaPagamento[];
   totalVendas: number;
   totalFrentistas: number;
   diferenca: number;
   podeFechar: boolean;
   observacoes: string;
   limparAutoSave: () => void;
   onSuccess?: () => void;
}

/**
 * Hook para gerenciar a lógica complexa de submissão do fechamento diário.
 * 
 * @returns { saving, error, success, handleSave }
 */
export function useSubmissaoFechamento() {
   const { postoAtivoId } = usePosto();
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   /**
    * Executa a persistência de todos os dados do fechamento.
    */
   const handleSave = async (params: SubmissaoParams) => {
      const {
         selectedDate,
         selectedTurno,
         bicos,
         leituras,
         sessoesFrentistas,
         payments,
         totalVendas,
         totalFrentistas,
         diferenca,
         podeFechar,
         observacoes,
         limparAutoSave
      } = params;

      if (!postoAtivoId) {
         setError('Posto não selecionado.');
         return;
      }

      if (!selectedTurno) {
         setError('Turno não selecionado.');
         return;
      }

      if (!podeFechar) {
         setError('Verifique os dados antes de salvar (Leituras inválidas ou Frentistas vazios).');
         return;
      }

      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         // 0. Limpar as leituras do dia ANTES de qualquer outra coisa.
         //
         // Roda sempre, exista ou não `Fechamento` para a data — e é justamente o caso "não
         // existe" que importa: dia histórico não tem fechamento, então antes isto era pulado,
         // o código inseria por cima das leituras já gravadas e o dia ficava com o dobro dos
         // litros (a agregação não separa por turno). Só há uma leitura por bico por dia.
         //
         // Vem antes de criar o `Fechamento` para não deixar fechamento órfão quando a exclusão
         // é recusada, e antes das outras duas exclusões porque é a única barrada pela janela de
         // 7 dias da RLS — `FechamentoFrentista` e `Recebimento` apagam sempre, e perdê-los para
         // depois descobrir que as leituras não saíram deixaria o dia pela metade.
         // Um DELETE barrado pela RLS não vira erro do Supabase: quem confere é o serviço,
         // contando o que sobrou.
         const leiturasAntigasRes = await leituraService.deleteByShift(selectedDate, selectedTurno, postoAtivoId);
         if (!isSuccess(leiturasAntigasRes)) {
            throw new Error(leiturasAntigasRes.error || 'Erro ao limpar as leituras anteriores');
         }

         // 1. Obter ou Criar Fechamento
         const fechamentoRes = await fechamentoService.getByDateAndTurno(selectedDate, selectedTurno, postoAtivoId);

         let fechamento;
         if (isSuccess(fechamentoRes) && fechamentoRes.data) {
            fechamento = fechamentoRes.data;

            const [frentistasRes, recebimentosRes] = await Promise.all([
               fechamentoFrentistaService.deleteByFechamento(fechamento.id),
               recebimentoService.deleteByFechamento(fechamento.id)
            ]);

            if (!isSuccess(frentistasRes)) {
               throw new Error(frentistasRes.error || 'Erro ao limpar os frentistas anteriores');
            }
            if (!isSuccess(recebimentosRes)) {
               throw new Error(recebimentosRes.error || 'Erro ao limpar os recebimentos anteriores');
            }
         } else {
            const createRes = await fechamentoService.create({
               data: selectedDate,
               usuario_id: USUARIO_SISTEMA_ID,
               turno_id: selectedTurno,
               status: 'RASCUNHO',
               posto_id: postoAtivoId
            });

            if (!isSuccess(createRes)) {
               throw new Error(createRes.error || 'Erro ao criar fechamento');
            }
            fechamento = createRes.data;
         }

         // 2. Salvar Leituras
         const leiturasToCreate = bicos
            .filter(b => leituras[b.id] && leituras[b.id].fechamento)
            .map(bico => ({
               bico_id: bico.id,
               data: selectedDate,
               leitura_inicial: parseValue(leituras[bico.id]?.inicial || ''),
               leitura_final: parseValue(leituras[bico.id]?.fechamento || ''),
               combustivel_id: bico.combustivel.id,
               preco_litro: bico.combustivel.preco_venda,
               usuario_id: USUARIO_SISTEMA_ID,
               turno_id: selectedTurno,
               posto_id: postoAtivoId
            }));

         if (leiturasToCreate.length > 0) {
            const leiturasRes = await leituraService.bulkCreate(leiturasToCreate);
            if (!isSuccess(leiturasRes)) {
               throw new Error(leiturasRes.error || 'Erro ao salvar leituras');
            }
         }

         // 3. Salvar Sessões de Frentistas
         if (sessoesFrentistas.length > 0) {
            const frentistasToCreate = sessoesFrentistas
               .filter(fs => fs.frentistaId !== null)
               .map(fs => {
                  // Aritmética canônica via @posto/utils (soma dos 7 buckets).
                  const meios = meiosDaSessao(fs);
                  const conf = conferido(meios);
                  const encerrante = parseValue(fs.valor_encerrante);
                  // diferenca = encerrante − conferido (positivo = FALTA). Só faz
                  // sentido quando há encerrante lançado.
                  const dif = encerrante > 0 ? calcularDiferenca(encerrante, conf) : 0;

                  return {
                     fechamento_id: fechamento.id,
                     frentista_id: fs.frentistaId!,
                     // Campos brutos preservados (não recomputa/zera o lump valor_cartao):
                     valor_cartao: parseValue(fs.valor_cartao),
                     valor_cartao_debito: meios.cartaoDebito,
                     valor_cartao_credito: meios.cartaoCredito,
                     valor_dinheiro: meios.dinheiro,
                     valor_moedas: meios.moedas,
                     valor_pix: meios.pix,
                     valor_nota: meios.nota,
                     baratao: meios.baratao,
                     encerrante,
                     diferenca_calculada: dif,
                     valor_conferido: conf, // soma dos declarados (não mais = encerrante)
                     observacoes: fs.observacoes || '',
                     posto_id: postoAtivoId
                  };
               });

            if (frentistasToCreate.length > 0) {
               const sessoesRes = await fechamentoFrentistaService.bulkCreate(frentistasToCreate);
               if (!isSuccess(sessoesRes)) {
                  throw new Error(sessoesRes.error || 'Erro ao salvar sessões de frentistas');
               }
            }
         }

         // 4. Salvar Pagamentos (Recebimentos)
         const recebimentosToCreate = payments
            .filter(p => parseValue(p.valor) > 0)
            .map(p => ({
               fechamento_id: fechamento.id,
               forma_pagamento_id: p.id,
               valor: parseValue(p.valor),
               observacoes: 'Fechamento Geral'
            }));

         if (recebimentosToCreate.length > 0) {
            const recebimentosRes = await recebimentoService.bulkCreate(recebimentosToCreate);
            if (!isSuccess(recebimentosRes)) {
               throw new Error(recebimentosRes.error || 'Erro ao salvar pagamentos');
            }
         }

         // 5. Atualizar Status do Fechamento
         const updateRes = await fechamentoService.update(fechamento.id, {
            status: 'FECHADO',
            total_vendas: totalVendas,
            total_recebido: totalFrentistas,
            diferenca: diferenca,
            observacoes: observacoes
         });

         if (!isSuccess(updateRes)) {
            throw new Error(updateRes.error || 'Erro ao finalizar fechamento');
         }

         setSuccess('Fechamento realizado com sucesso!');
         console.log('[29/01 13:40] Fechamento salvo com sucesso, aguardando persistência no banco...');

         // [29/01 13:40] Aguarda 500ms para garantir persistência no banco antes de limpar
         await new Promise(resolve => setTimeout(resolve, 500));

         limparAutoSave();
         console.log('[29/01 13:40] AutoSave limpo, atualizando visualização...');

         // [29/01 14:10] Em vez de recarregar a página, chama callback para atualizar dados em tela
         setTimeout(() => {
            if (params.onSuccess) {
               params.onSuccess();
            }
         }, 1500);

      } catch (err: unknown) {
         console.error('❌ Erro na submissão:', err);
         setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar fechamento');
      } finally {
         setSaving(false);
      }
   };

   return {
      saving,
      error,
      success,
      handleSave,
      setError,
      setSuccess
   };
}
