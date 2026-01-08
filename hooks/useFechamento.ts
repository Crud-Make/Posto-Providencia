/**
 * Hook para cálculos e validações consolidadas do fechamento
 *
 * @remarks
 * Centraliza lógica de cálculo de totais, diferenças,
 * sumários por combustível e validações gerais
 *
 * @author Sistema de Gestão - Posto-Providência
 * @version 1.0.0
 */

import { useMemo } from 'react';
import type { BicoComDetalhes, SessaoFrentista, EntradaPagamento } from '../types/fechamento';
import {
  calcularLitros,
  calcularVenda,
  agruparPorCombustivel,
  calcularTotais,
  calcularPercentual,
  validarLeitura,
  type SumarioCombustivel
} from '../utils/calculators';
import { analisarValor } from '../utils/formatters';

/**
 * Retorno do hook useFechamento
 */
interface RetornoFechamento {
  // Sumários
  sumarioPorCombustivel: SumarioCombustivel[];

  // Totais
  totalLitros: number;
  totalVendas: number;
  totalFrentistas: number;
  totalPagamentos: number;
  totalProdutos: number;

  // Diferenças e análises
  diferenca: number;
  diferencaPercentual: number;
  totalTaxas: number;
  valorLiquido: number;

  // Validações
  temLeiturasInvalidas: boolean;
  temFrentistasVazios: boolean;
  podeFechar: boolean;

  // Formatações para exibição
  exibicao: {
    totalLitros: string;
    totalVendas: string;
    totalFrentistas: string;
    diferenca: string;
    totalTaxas: string;
    valorLiquido: string;
  };
}

/**
 * Hook customizado para cálculos consolidados do fechamento
 *
 * @param bicos - Lista de bicos com detalhes
 * @param leituras - Mapa de leituras por ID do bico
 * @param sessoesFrentistas - Sessões de frentistas
 * @param pagamentos - Formas de pagamento
 * @returns Cálculos consolidados e validações
 *
 * @remarks
 * - Calcula todos os totais necessários
 * - Agrupa vendas por combustível
 * - Valida leituras e dados de frentistas
 * - Retorna valores numéricos e formatados
 *
 * @example
 * const { diferenca, podeFechar } = useFechamento(
 *   bicos, leituras, sessoesFrentistas, pagamentos
 * );
 */
export const useFechamento = (
  bicos: BicoComDetalhes[],
  leituras: Record<number, { inicial: string; fechamento: string }>,
  sessoesFrentistas: SessaoFrentista[],
  pagamentos: EntradaPagamento[]
): RetornoFechamento => {
  /**
   * Sumário agrupado por tipo de combustível
   */
  const sumarioPorCombustivel = useMemo(() => {
    return agruparPorCombustivel(bicos, leituras);
  }, [bicos, leituras]);

  /**
   * Totais calculados de leituras (litros e vendas)
   */
  const totaisLeituras = useMemo(() => {
    return calcularTotais(bicos, leituras);
  }, [bicos, leituras]);

  /**
   * Total recebido pelos frentistas (soma de valor_conferido)
   */
  const totalFrentistas = useMemo(() => {
    return sessoesFrentistas.reduce((acc, fs) => {
      return acc + analisarValor(fs.valor_conferido);
    }, 0);
  }, [sessoesFrentistas]);

  /**
   * Total de produtos vendidos (soma de valor_produtos)
   */
  const totalProdutos = useMemo(() => {
    return sessoesFrentistas.reduce((acc, fs) => {
      return acc + analisarValor(fs.valor_produtos);
    }, 0);
  }, [sessoesFrentistas]);

  /**
   * Total por forma de pagamento
   */
  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((acc, p) => {
      return acc + analisarValor(p.valor);
    }, 0);
  }, [pagamentos]);

  /**
   * Diferença entre encerrantes e recebido pelos frentistas
   *
   * @remarks
   * Diferença positiva: sobra (frentistas receberam mais)
   * Diferença negativa: falta (frentistas receberam menos)
   */
  const diferenca = useMemo(() => {
    return totalFrentistas - totaisLeituras.valor;
  }, [totalFrentistas, totaisLeituras.valor]);

  /**
   * Diferença em percentual em relação ao total de vendas
   */
  const diferencaPercentual = useMemo(() => {
    return calcularPercentual(Math.abs(diferenca), totaisLeituras.valor);
  }, [diferenca, totaisLeituras.valor]);

  /**
   * Total de taxas de pagamento
   */
  const totalTaxas = useMemo(() => {
    return pagamentos.reduce((acc, p) => {
      const valor = analisarValor(p.valor);
      const taxa = (valor * p.taxa) / 100;
      return acc + taxa;
    }, 0);
  }, [pagamentos]);

  /**
   * Valor líquido (total recebido - taxas)
   */
  const valorLiquido = useMemo(() => {
    return totalFrentistas - totalTaxas;
  }, [totalFrentistas, totalTaxas]);

  /**
   * Validação: verifica se há leituras inválidas (fechamento < inicial)
   */
  const temLeiturasInvalidas = useMemo(() => {
    return bicos.some(bico => {
      const leitura = leituras[bico.id];
      if (!leitura) return false;
      return !validarLeitura(leitura.inicial, leitura.fechamento);
    });
  }, [bicos, leituras]);

  /**
   * Validação: verifica se há frentistas sem frentista selecionado ou valor zero
   */
  const temFrentistasVazios = useMemo(() => {
    return sessoesFrentistas.some(
      fs => !fs.frentistaId || analisarValor(fs.valor_conferido) === 0
    );
  }, [sessoesFrentistas]);

  /**
   * Validação geral: pode fechar?
   *
   * @remarks
   * Critérios:
   * - Não ter leituras inválidas
   * - Não ter frentistas vazios
   * - Ter pelo menos uma leitura
   * - Ter pelo menos um frentista
   */
  const podeFechar = useMemo(() => {
    return (
      !temLeiturasInvalidas &&
      !temFrentistasVazios &&
      Object.keys(leituras).length > 0 &&
      sessoesFrentistas.length > 0
    );
  }, [temLeiturasInvalidas, temFrentistasVazios, leituras, sessoesFrentistas]);

  /**
   * Formatações para exibição
   */
  const exibicao = useMemo(() => {
    const formatarReais = (valor: number) =>
      valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    return {
      totalLitros: totaisLeituras.litrosExibicao,
      totalVendas: formatarReais(totaisLeituras.valor),
      totalFrentistas: formatarReais(totalFrentistas),
      diferenca: formatarReais(diferenca),
      totalTaxas: formatarReais(totalTaxas),
      valorLiquido: formatarReais(valorLiquido)
    };
  }, [totaisLeituras, totalFrentistas, diferenca, totalTaxas, valorLiquido]);

  return {
    // Sumários
    sumarioPorCombustivel,

    // Totais
    totalLitros: totaisLeituras.litros,
    totalVendas: totaisLeituras.valor,
    totalFrentistas,
    totalPagamentos,
    totalProdutos,

    // Diferenças e análises
    diferenca,
    diferencaPercentual,
    totalTaxas,
    valorLiquido,

    // Validações
    temLeiturasInvalidas,
    temFrentistasVazios,
    podeFechar,

    // Formatações
    exibicao
  };
};
