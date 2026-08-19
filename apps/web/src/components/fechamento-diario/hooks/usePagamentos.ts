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
import { useState, useCallback, useMemo } from 'react';
import type { EntradaPagamento } from '../../../types/fechamento';
import type { Recebimento } from '../../../types/database/aliases';
import { formaPagamentoService } from '../../../services/api';
import { fechamentoService } from '../../../services/api/fechamento.service';
import { analisarValor, formatarValorSimples, formatarValorAoSair, paraReais } from '../../../utils/formatters';
import { baldeDaForma, totaisPorBalde } from '../../../utils/fechamentoMeios';
import { isSuccess } from '../../../types/ui/response-types';

/**
 * Retorno do hook usePagamentos
 */
interface RetornoPagamentos {
  pagamentos: EntradaPagamento[];
  carregando: boolean;
  totalPagamentos: number;
  totalTaxas: number;
  totalLiquido: number;
  carregarPagamentos: (data?: string) => Promise<void>;
  alterarPagamento: (indice: number, valor: string) => void;
  aoSairPagamento: (indice: number) => void;
  sincronizarComSessoes: (sessoes: import('../../../types/fechamento').SessaoFrentista[]) => void;
  definirPagamentos: React.Dispatch<React.SetStateAction<EntradaPagamento[]>>;
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

  /**
   * Carrega formas de pagamento do banco e valores salvos se houver
   */
  const carregarPagamentos = useCallback(async (data?: string) => {
    if (!postoId) return;

    setCarregando(true);
    try {
      // 1. Carrega definições de formas de pagamento
      const dadosRes = await formaPagamentoService.getAll(postoId);
      if (!isSuccess(dadosRes)) {
        console.error('❌ Erro ao carregar formas de pagamento:', dadosRes.error);
        setPagamentos([]);
        return;
      }

      const formasPagamento = dadosRes.data;
      let valoresSalvos: Record<number, number> = {};

      // 2. Se a data foi fornecida, busca valores salvos
      if (data) {
        const fechamentoRes = await fechamentoService.getDoDia(data, postoId);

        if (isSuccess(fechamentoRes) && fechamentoRes.data) {
          const detalhesRes = await fechamentoService.getWithDetails(fechamentoRes.data.id);

          if (isSuccess(detalhesRes) && detalhesRes.data.recebimentos) {
            // [29/01 13:40] Recebimentos carregados do banco
            console.log('[29/01 13:40] Recebimentos carregados do banco:', detalhesRes.data.recebimentos.length, 'registros');
            detalhesRes.data.recebimentos.forEach((r: Recebimento) => {
              // Recebimento deve ter forma_pagamento_id
              if (r.forma_pagamento_id) {
                valoresSalvos[r.forma_pagamento_id] = r.valor;
              }
            });
            console.log('[29/01 13:40] Valores salvos mapeados:', Object.keys(valoresSalvos).length, 'formas de pagamento');
          }
        }
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

    } catch (err) {
      console.error('❌ Erro ao carregar formas de pagamento:', err);
    } finally {
      setCarregando(false);
    }
  }, [postoId]);

  /**
   * Handler para mudança de valor de pagamento
   *
   * @remarks
   * Aceita apenas números e uma vírgula
   * Impede múltiplas vírgulas
   */
  const alterarPagamento = useCallback((indice: number, valor: string) => {
    const formatado = formatarValorSimples(valor);
    setPagamentos(prev => {
      const atualizado = [...prev];
      atualizado[indice] = { ...atualizado[indice], valor: formatado };
      return atualizado;
    });
  }, []);

  /**
   * Handler para blur (formata como R$ X,XX)
   */
  const aoSairPagamento = useCallback((indice: number) => {
    setPagamentos(prev => {
      const atualizado = [...prev];
      const valorString = atualizado[indice].valor;

      if (!valorString) return prev;

      const formatado = formatarValorAoSair(valorString);
      atualizado[indice] = { ...atualizado[indice], valor: formatado };
      return atualizado;
    });
  }, []);
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
   * Calcula total de todos os pagamentos
   */
  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((acc, p) => {
      return acc + analisarValor(p.valor);
    }, 0);
  }, [pagamentos]);

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
    totalPagamentos,
    totalTaxas,
    totalLiquido,
    carregarPagamentos,
    alterarPagamento,
    aoSairPagamento,
    sincronizarComSessoes,
    definirPagamentos: setPagamentos
  };
};
