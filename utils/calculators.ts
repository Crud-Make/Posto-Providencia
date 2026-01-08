/**
 * Funções utilitárias para cálculos do fechamento diário
 *
 * @remarks
 * Centraliza lógica de cálculos de litros, vendas, percentuais
 * e validações de leituras. Todas as funções são puras (sem side effects).
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import type { BicoComDetalhes } from '../types/fechamento';
import { analisarValor, formatarParaBR, paraReais } from './formatters';

/**
 * Resultado de um cálculo com valor numérico e exibição formatada
 *
 * @remarks
 * Usado para retornar tanto o valor para cálculos quanto
 * a string formatada para exibição
 */
export interface ResultadoCalculo {
  valor: number; // Valor numérico para cálculos
  exibicao: string; // String formatada para exibição
}

/**
 * Calcula litros vendidos baseado em leituras de encerrante
 *
 * @param leituraInicial - Leitura inicial do encerrante (formato BR: "1.234,567")
 * @param leituraFechamento - Leitura final do encerrante (formato BR: "5.678,901")
 * @returns Objeto com valor numérico e string de exibição
 *
 * @remarks
 * REGRA DA PLANILHA: Se fechamento ≤ inicial → mostra "-"
 * Isso indica que não houve venda ou leitura inválida
 *
 * @example
 * calcularLitros("1.000,500", "1.500,750")
 * // { valor: 500.25, exibicao: "500,250" }
 *
 * calcularLitros("1.500,000", "1.000,000")
 * // { valor: 0, exibicao: "-" }
 */
export const calcularLitros = (
  leituraInicial: string,
  leituraFechamento: string
): ResultadoCalculo => {
  const inicial = analisarValor(leituraInicial || '');
  const fechamento = analisarValor(leituraFechamento || '');

  // REGRA DA PLANILHA: Se fechamento ≤ inicial → mostra "-"
  if (fechamento <= inicial || fechamento === 0) {
    return { valor: 0, exibicao: '-' };
  }

  const litros = fechamento - inicial;
  return {
    valor: litros,
    exibicao: formatarParaBR(litros, 3)
  };
};

/**
 * Calcula valor da venda (litros × preço)
 *
 * @param litros - Quantidade de litros vendidos
 * @param precoUnitario - Preço por litro
 * @returns Objeto com valor numérico e string formatada em R$
 *
 * @remarks
 * REGRA DA PLANILHA: Se litros = "-" → venda = "-"
 * Se litros for zero ou negativo, retorna "-"
 *
 * @example
 * calcularVenda(100, 5.5)
 * // { valor: 550.00, exibicao: "R$ 550,00" }
 *
 * calcularVenda(0, 5.5)
 * // { valor: 0, exibicao: "-" }
 */
export const calcularVenda = (
  litros: number,
  precoUnitario: number
): ResultadoCalculo => {
  // REGRA DA PLANILHA: Se litros = 0 → venda = "-"
  if (litros <= 0) {
    return { valor: 0, exibicao: '-' };
  }

  const venda = litros * precoUnitario;
  return {
    valor: venda,
    exibicao: paraReais(venda)
  };
};

/**
 * Valida se leituras são válidas para cálculo
 *
 * @param leituraInicial - Leitura inicial do encerrante
 * @param leituraFechamento - Leitura final do encerrante
 * @returns true se fechamento > inicial, false caso contrário
 *
 * @remarks
 * Leitura válida significa que houve avanço no encerrante
 * (fechamento maior que inicial)
 *
 * @example
 * validarLeitura("1.000", "1.500") // true
 * validarLeitura("1.500", "1.000") // false
 * validarLeitura("1.000", "1.000") // false
 */
export const validarLeitura = (
  leituraInicial: string,
  leituraFechamento: string
): boolean => {
  const fechamento = analisarValor(leituraFechamento || '');
  const inicial = analisarValor(leituraInicial || '');
  return fechamento > inicial;
};

/**
 * Sumário agrupado por combustível
 *
 * @remarks
 * Usado para consolidar vendas de múltiplos bicos
 * do mesmo tipo de combustível
 */
export interface SumarioCombustivel {
  nome: string; // Nome do combustível (ex: "Gasolina Comum")
  codigo: string; // Código do combustível (ex: "GC")
  litros: number; // Total de litros vendidos
  valor: number; // Valor total das vendas
  preco: number; // Preço unitário
}

/**
 * Agrupa vendas por tipo de combustível
 *
 * @param bicos - Lista de bicos com detalhes
 * @param leituras - Mapa de leituras por ID do bico
 * @returns Array com sumário por combustível
 *
 * @remarks
 * Consolida vendas de múltiplos bicos do mesmo combustível
 * Útil para relatórios e visualizações consolidadas
 *
 * @example
 * const sumario = agruparPorCombustivel(bicos, leituras);
 * // [
 * //   { nome: "Gasolina Comum", codigo: "GC", litros: 1000, valor: 5500, preco: 5.5 },
 * //   { nome: "Etanol", codigo: "ET", litros: 500, valor: 2000, preco: 4.0 }
 * // ]
 */
export const agruparPorCombustivel = (
  bicos: BicoComDetalhes[],
  leituras: Record<number, { inicial: string; fechamento: string }>
): SumarioCombustivel[] => {
  const sumario: Record<string, SumarioCombustivel> = {};

  bicos.forEach(bico => {
    const codigo = bico.combustivel.codigo;
    const leitura = leituras[bico.id];

    if (!leitura) return;

    // Inicializa sumário para este combustível se não existir
    if (!sumario[codigo]) {
      sumario[codigo] = {
        nome: bico.combustivel.nome,
        codigo: codigo,
        litros: 0,
        valor: 0,
        preco: bico.combustivel.preco_venda
      };
    }

    // Calcula litros e venda para este bico
    const litrosCalc = calcularLitros(leitura.inicial, leitura.fechamento);
    const vendaCalc = calcularVenda(litrosCalc.valor, bico.combustivel.preco_venda);

    // Soma apenas se houve venda válida
    if (litrosCalc.exibicao !== '-') {
      sumario[codigo].litros += litrosCalc.valor;
      sumario[codigo].valor += vendaCalc.valor;
    }
  });

  return Object.values(sumario);
};

/**
 * Calcula percentual de um valor em relação ao total
 *
 * @param valor - Valor parcial
 * @param total - Valor total
 * @returns Percentual (0-100)
 *
 * @remarks
 * Retorna 0 se total for zero para evitar divisão por zero
 *
 * @example
 * calcularPercentual(50, 200) // 25.0
 * calcularPercentual(100, 0) // 0
 */
export const calcularPercentual = (valor: number, total: number): number => {
  if (total === 0) return 0;
  return (valor / total) * 100;
};

/**
 * Calcula totais consolidados de litros e vendas
 *
 * @param bicos - Lista de bicos com detalhes
 * @param leituras - Mapa de leituras por ID do bico
 * @returns Objeto com totais de litros e valores
 *
 * @remarks
 * Consolida todas as vendas de todos os bicos
 * Retorna valores numéricos e strings formatadas
 *
 * @example
 * const totais = calcularTotais(bicos, leituras);
 * // {
 * //   litros: 1500.250,
 * //   valor: 7500.00,
 * //   litrosExibicao: "1.500,250",
 * //   valorExibicao: "R$ 7.500,00"
 * // }
 */
export const calcularTotais = (
  bicos: BicoComDetalhes[],
  leituras: Record<number, { inicial: string; fechamento: string }>
): {
  litros: number;
  valor: number;
  litrosExibicao: string;
  valorExibicao: string;
} => {
  let totalLitros = 0;
  let totalValor = 0;

  bicos.forEach(bico => {
    const leitura = leituras[bico.id];
    if (!leitura) return;

    const litrosCalc = calcularLitros(leitura.inicial, leitura.fechamento);
    const vendaCalc = calcularVenda(litrosCalc.valor, bico.combustivel.preco_venda);

    if (litrosCalc.exibicao !== '-') {
      totalLitros += litrosCalc.valor;
      totalValor += vendaCalc.valor;
    }
  });

  return {
    litros: totalLitros,
    valor: totalValor,
    litrosExibicao: formatarParaBR(totalLitros, 3),
    valorExibicao: paraReais(totalValor)
  };
};
