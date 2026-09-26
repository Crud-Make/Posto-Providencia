/**
 * Hook para gerenciamento de formas de pagamento
 *
 * @remarks
 * Controla valores recebidos por cada forma de pagamento,
 * calcula totais, taxas e líquido
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [09/01 09:40] Correção de tipagem no mapeamento de pagamentos
// Motivo: Propriedade 'taxa' estava sendo acessada incorretamente como 'taxa_percentual'
// [18/01 00:00] Adaptar consumo do formaPagamentoService para ApiResponse
// Motivo: Services agora retornam { success, data, error } (Smart Types)

import * as React from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import type { EntradaPagamento } from '../../../types/fechamento';
import type { FormaPagamento, Recebimento } from '../../../types/database/aliases';
import { formaPagamentoService } from '../../../services/api';
import { descreverErroDaApi, urlDaApi } from '../../../services/api/base';
import { fechamentoService } from '../../../services/api/fechamento.service';
import { lerFechamentoDoDiaDaApi } from '../../../services/api/fechamento.api';
import { lerFormasDePagamentoDaApi } from '../../../services/api/formaPagamento.api';
import { analisarValor, paraReais } from '../../../utils/formatters';
import { baldeDaForma, totaisPorBalde } from '../../../utils/fechamentoMeios';
import {
  type ApiResponse,
  createErrorResponse,
  createSuccessResponse,
  isSuccess
} from '../../../types/ui/response-types';

/**
 * Retorno do hook usePagamentos
 */
interface RetornoPagamentos {
  pagamentos: EntradaPagamento[];
  carregando: boolean;
  totalTaxas: number;
  totalLiquido: number;
  carregarPagamentos: (data?: string, force?: boolean) => Promise<void>;
  sincronizarComSessoes: (sessoes: import('../../../types/fechamento').SessaoFrentista[]) => void;
  definirPagamentos: React.Dispatch<React.SetStateAction<EntradaPagamento[]>>;
}

/**
 * Os recebimentos gravados no dia — vazio quando o dia não tem fechamento, ou quando a leitura
 * falha (o erro vai para o console; as formas de pagamento carregam do mesmo jeito, como sempre).
 *
 * @remarks
 * [20/09] Pela API Laravel (#103 P7) quando VITE_API_URL existe; sem ela, nada muda. A troca é
 * AQUI, no call site, e não dentro de `fechamentoService.getDoDia`: `useSubmissaoFechamento` e
 * `consolidacao.service` chamam o mesmo método para ESCREVER no Supabase, e ler de uma fonte e
 * gravar noutra já acertou linhas diferentes no mesmo dia neste sistema. Pela API é UMA ida à
 * rede (o Resource traz os recebimentos aninhados) onde o Supabase faz DUAS (o pai, depois os
 * detalhes). A paridade (números, null continua null — I8 —, um fechamento só, o mais recente,
 * recebimentos por id) fica em `fechamento.api.ts`. Dia sem fechamento é `Ok(null)` na API e
 * `data: null` no Supabase: nos dois, lista vazia sem erro.
 */
async function recebimentosDoDia(data: string, postoId: number): Promise<Pick<Recebimento, 'forma_pagamento_id' | 'valor'>[]> {
  if (urlDaApi() !== null) {
    return lerFechamentoDoDiaDaApi(postoId, data).match(
      (fechamento) => (fechamento === null ? [] : fechamento.recebimentos),
      (erro) => {
        console.error('❌ Erro ao carregar os recebimentos do dia:', descreverErroDaApi(erro));
        return [];
      }
    );
  }

  const fechamentoRes = await fechamentoService.getDoDia(data, postoId);
  if (!isSuccess(fechamentoRes) || fechamentoRes.data === null) return [];

  const detalhesRes = await fechamentoService.getWithDetails(fechamentoRes.data.id);
  return isSuccess(detalhesRes) ? detalhesRes.data.recebimentos : [];
}

/**
 * Hook customizado para gerenciamento de pagamentos
 *
 * @param postoId - ID do posto ativo
 * @returns Pagamentos e funções de controle
 *
 * @remarks
 * - Carrega formas de pagamento do banco
 * - Calcula totais, taxas e valor líquido
 * - Formata valores durante digitação e ao sair
 *
 * @example
 * const { pagamentos, totalLiquido } = usePagamentos(postoId);
 */
export const usePagamentos = (postoId: number | null): RetornoPagamentos => {
  const [pagamentos, setPagamentos] = useState<EntradaPagamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const ultimoContextoCarregado = useRef<string>('');

  /**
   * Carrega formas de pagamento do banco e valores salvos se houver
   */
  const carregarPagamentos = useCallback(async (data?: string, force = false) => {
    if (!postoId) return;

    // Mesma trava de `carregarSessoes`/`carregarLeituras`: o efeito de restauração
    // em `index.tsx` redispara a cada troca de identidade dos carregadores, e sem
    // isto cada recarga remontava `pagamentos` a partir do banco (ou vazio), apagando
    // o que o gerente tinha DIGITADO no Caixa Geral e ainda não salvo. Recarga
    // deliberada (depois de salvar) passa `force`.
    const chave = `${postoId}|${data ?? ''}`;
    if (!force && ultimoContextoCarregado.current === chave) return;

    setCarregando(true);
    try {
      // 1. Carrega definições de formas de pagamento.
      // [19/09] Pela API Laravel (#97) quando VITE_API_URL existe; sem ela, nada muda. A
      // troca é AQUI, no call site, e não dentro de `formaPagamentoService.getAll`: o
      // `aggregator.service.ts` (:353, :421) chama o mesmo método, e o aggregator é sítio de
      // fórmula que só o Fable edita (Design Doc fechamento-diario-api.md §2). O filtro de
      // `ativo` é do cliente (`CatalogoDoPosto::formasPagamento` não filtra;
      // `formaPagamento.service.ts:25` filtrava). `taxa` chega como string decimal e já vem
      // em número de `formaPagamento.api.ts`; a conta da taxa (abaixo) não muda.
      const dadosRes: ApiResponse<FormaPagamento[]> =
        urlDaApi() !== null
          ? await lerFormasDePagamentoDaApi(postoId).match(
              (formas) => createSuccessResponse(formas),
              (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR')
            )
          : await formaPagamentoService.getAll(postoId);
      if (!isSuccess(dadosRes)) {
        console.error('❌ Erro ao carregar formas de pagamento:', dadosRes.error);
        setPagamentos([]);
        return;
      }

      const formasPagamento = dadosRes.data;
      let valoresSalvos: Record<number, number> = {};

      // 2. Se a data foi fornecida, busca valores salvos
      if (data) {
        const recebimentos = await recebimentosDoDia(data, postoId);
        // [29/01 13:40] Recebimentos carregados do banco
        console.log('[29/01 13:40] Recebimentos carregados do banco:', recebimentos.length, 'registros');
        recebimentos.forEach((r) => {
          // Recebimento deve ter forma_pagamento_id
          if (r.forma_pagamento_id) {
            valoresSalvos[r.forma_pagamento_id] = r.valor;
          }
        });
        console.log('[29/01 13:40] Valores salvos mapeados:', Object.keys(valoresSalvos).length, 'formas de pagamento');
      }

      // 3. Mescla definições com valores (ou vazio)
      const inicializados: EntradaPagamento[] = formasPagamento.map(fp => ({
        id: fp.id,
        nome: fp.nome,
        tipo: fp.tipo,
        // `paraReais` direto, NUNCA `formatarValorSimples(valor.toFixed(2))`: o `toFixed`
        // produz ponto decimal ("2436.00") e `formatarValorSimples` trata todo ponto como
        // separador de milhar — apagava o ponto, relia "243600" e devolvia "R$ 243.600".
        // R$ 2.436,00 salvos voltavam como R$ 243.600 na tela.
        valor: valoresSalvos[fp.id] ? paraReais(valoresSalvos[fp.id]) : '',
        taxa: fp.taxa || 0
      }));

      setPagamentos(inicializados);
      ultimoContextoCarregado.current = chave;

    } catch (err) {
      console.error('❌ Erro ao carregar formas de pagamento:', err);
    } finally {
      setCarregando(false);
    }
  }, [postoId]);

  /**
   * Sincroniza pagamentos com o valor total dos frentistas
   */
  const sincronizarComSessoes = useCallback((sessoes: import('../../../types/fechamento').SessaoFrentista[]) => {
    // Uma passada só sobre as sessões, consolidando nos baldes canônicos. A versão
    // anterior era uma cadeia de `includes` sobre `nome + tipo` que reduzia as sessões
    // de novo em cada ramo — e errava dinheiro em dois pontos: "Vale/Check" caía no
    // ramo do `nota` (por conter "vale") e lançava a nota duas vezes, enquanto moedas
    // e baratão não achavam forma nenhuma e sumiam. Ver `fechamentoMeios.test.ts`.
    //
    // `tipo` saiu da comparação de propósito: as 7 formas cadastradas têm `tipo`
    // 'venda', então ele nunca desempatou nada e só criava chance de falso positivo.
    const totais = totaisPorBalde(sessoes);

    setPagamentos(prev => prev.map(p => {
      const balde = baldeDaForma(p.nome);
      if (!balde) return p; // "Vale/Check", "APP": sem coluna de origem, não se inventa valor

      const sum = totais[balde];
      // `sum` JÁ é o valor em reais somado das sessões — formate direto.
      // Não passe por `formatarValorAoSair`: ela chama `analisarValor`, que é parser de
      // ENCERRANTE DE BOMBA e assume os últimos 3 dígitos como decimais quando não há
      // vírgula (litros têm 3 casas). Em dinheiro isso divide por mil: o auto-preencher
      // trazia R$ 2,44 no lugar de R$ 2.436,00.
      return { ...p, valor: sum > 0 ? paraReais(sum) : '' };
    }));
  }, []);
  /**
   * Calcula total de taxas (soma de valor × taxa de cada pagamento)
   */
  const totalTaxas = useMemo(() => {
    return pagamentos.reduce((acc, p) => {
      const valor = analisarValor(p.valor);
      return acc + (valor * (p.taxa / 100));
    }, 0);
  }, [pagamentos]);

  /**
   * Calcula valor líquido (total - taxas)
   */
  const totalLiquido = useMemo(() => {
    return pagamentos.reduce((acc, p) => {
      const valor = analisarValor(p.valor);
      const desconto = valor * (p.taxa / 100);
      return acc + (valor - desconto);
    }, 0);
  }, [pagamentos]);

  return {
    pagamentos,
    carregando,
    totalTaxas,
    totalLiquido,
    carregarPagamentos,
    sincronizarComSessoes,
    definirPagamentos: setPagamentos
  };
};
