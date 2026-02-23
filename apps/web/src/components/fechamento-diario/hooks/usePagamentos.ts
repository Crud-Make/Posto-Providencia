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
import { fechamentoFrentistaService, frentistaService } from '../../../services/api';
import { formaPagamentoService } from '../../../services/api';
import { fechamentoService } from '../../../services/api/fechamento.service';
import { analisarValor, paraReais, formatarValorSimples, formatarValorAoSair } from '../../../utils/formatters';
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
  carregarPagamentos: (data?: string, turno?: number) => Promise<void>;
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
  const carregarPagamentos = useCallback(async (data?: string, turno?: number) => {
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

      // 2. Se data e turno fornecidos, busca valores salvos
      if (data && turno) {
        const fechamentoRes = await fechamentoService.getByDateAndTurno(data, turno, postoId);

        if (isSuccess(fechamentoRes) && fechamentoRes.data) {
          const detalhesRes = await fechamentoService.getWithDetails(fechamentoRes.data.id);

          if (isSuccess(detalhesRes) && detalhesRes.data.recebimentos) {
            // [29/01 13:40] Recebimentos carregados do banco
            console.log('[29/01 13:40] Recebimentos carregados do banco:', detalhesRes.data.recebimentos.length, 'registros');
            detalhesRes.data.recebimentos.forEach((r: any) => {
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
        valor: valoresSalvos[fp.id] ? formatarValorSimples(valoresSalvos[fp.id].toFixed(2)) : '',
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
    setPagamentos(prev => prev.map(p => {
      let sum = 0;
      const t = (p.nome + ' ' + (p.tipo || '')).toLowerCase();

      let matched = false;
      if (t.includes('dinheiro')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_dinheiro), 0);
        matched = true;
      } else if (t.includes('crédito') || t.includes('credito')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_cartao_credito), 0);
        matched = true;
      } else if (t.includes('débito') || t.includes('debito')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_cartao_debito) + analisarValor(s.valor_cartao), 0);
        matched = true;
      } else if (t.includes('pix')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_pix), 0);
        matched = true;
      } else if (t.includes('nota') || t.includes('convênio') || t.includes('convenio') || t.includes('vale')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_nota), 0);
        matched = true;
      } else if (t.includes('baratao') || t.includes('baratão') || t.includes('baratão')) {
        sum = sessoes.reduce((acc, s) => acc + analisarValor(s.valor_baratao), 0);
        matched = true;
      }

      if (matched) {
        return {
          ...p,
          valor: sum > 0 ? formatarValorAoSair(sum.toString()) : ''
        };
      }
      return p;
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
