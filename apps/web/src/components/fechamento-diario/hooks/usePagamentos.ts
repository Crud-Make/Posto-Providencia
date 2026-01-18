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
import { formaPagamentoService } from '../../../services/api';
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
  carregarPagamentos: () => Promise<void>;
  alterarPagamento: (indice: number, valor: string) => void;
  aoSairPagamento: (indice: number) => void;
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
   * Carrega formas de pagamento do banco
   */
  const carregarPagamentos = useCallback(async () => {
    if (!postoId) return;

    setCarregando(true);
    try {
      // [18/01 00:00] Checar success e extrair data do ApiResponse
      // Motivo: formaPagamentoService agora retorna ApiResponse
      const dadosRes = await formaPagamentoService.getAll(postoId);
      if (!isSuccess(dadosRes)) {
        console.error('❌ Erro ao carregar formas de pagamento:', dadosRes.error);
        setPagamentos([]);
        return;
      }

      const dados = dadosRes.data;
      const inicializados: EntradaPagamento[] = dados.map(fp => ({
        id: fp.id,
        nome: fp.nome,
        tipo: fp.tipo,
        valor: '',
        taxa: fp.taxa || 0
      }));
      setPagamentos(inicializados);
      console.log('✅ Formas de pagamento carregadas');
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
    definirPagamentos: setPagamentos
  };
};
