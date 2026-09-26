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
import type { BicoComDetalhes, SessaoFrentista, EntradaPagamento } from '../../../types/fechamento';
import {
  agruparPorCombustivel,
  calcularPercentual,
  validarLeitura,
  type SumarioCombustivel
} from '../../../utils/calculators';
import { analisarValor, formatarParaBR } from '../../../utils/formatters';
import { vendaDoDiaPeloEncerrante } from '../../../utils/venda-do-dia';
import { conferido, diferenca as diferencaCanonica } from '@posto/utils';
import {
  meiosDaSessao,
  sessaoBloqueiaFechamento,
  sessaoSemMovimento
} from '../../../utils/fechamentoMeios';

/**
 * Retorno do hook useFechamento
 */
interface RetornoFechamento {
  // Sumários
  sumarioPorCombustivel: SumarioCombustivel[];

  // Totais
  totalLitros: number;
  /** Venda do dia pelo ENCERRANTE, quantizada — ou `null` = dia não apurado (I8, #103 P8). */
  totalVendas: number | null;
  totalFrentistas: number;
  totalPagamentos: number;

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
   * Totais das leituras (litros e venda) PELO ENCERRANTE — a única fonte do
   * `total_vendas` do painel desde 22/09/2026 (#103 P8, Design Doc §7 d).
   * `totalVendas` é `null` quando há menos bicos lidos que bicos ativos.
   */
  const totaisLeituras = useMemo(() => {
    return vendaDoDiaPeloEncerrante(bicos, leituras);
  }, [bicos, leituras]);

  /**
   * Total recebido pelos frentistas (soma dos valores declarados)
   */
  const totalFrentistas = useMemo(() => {
    // conferido canônico (7 buckets, cartão aditivo, inclui moedas) via @posto/utils
    return sessoesFrentistas.reduce((acc, fs) => acc + conferido(meiosDaSessao(fs)), 0);
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
   * Diferença de caixa do dia: concentrador − conferido.
   *
   * @returns Positivo = **FALTA**, negativo = **SOBRA** (§6).
   *
   * @remarks Estava invertido até 16/08/2026 (`totalFrentistas −
   *          totaisLeituras.valor`), com JSDoc afirmando o contrário. O estrago
   *          não era só de rótulo: este valor é gravado em `Fechamento.diferenca`
   *          por `useSubmissaoFechamento`, e os FILHOS da mesma submissão
   *          (`FechamentoFrentista.diferenca_calculada`) já usavam a convenção
   *          canônica — pai e filho da mesma linha discordavam do sinal, e o
   *          histórico carregado pelo ETL também é canônico.
   *
   *          Agora chama o módulo, em vez de repetir a conta: era a quarta
   *          reimplementação da mesma aritmética no painel.
   *
   *          O que está coberto, e por quem (atualizado em 22/09/2026, quando a
   *          fonte do `total_vendas` trocou — #103 P8):
   *          - a SUBTRAÇÃO (`diferencaCanonica`, sinal) → `totais-do-dia.golden.spec.ts`
   *            e os 4 casos de sinal de `useFechamento.test.ts`;
   *          - a ENTRADA `totaisLeituras.totalVendas` (`vendaDoDiaPeloEncerrante`) →
   *            `utils/venda-do-dia.golden.spec.ts`, 31 dias reais de janeiro/2026: ao preço
   *            do dia reproduz a planilha a 1 centavo, já sai quantizada, e é o MESMO número
   *            de `totalVendasDoEncerrante` (`@posto/utils`). Até 22/09 a entrada era
   *            `calcularTotais` (float, quantizado tarde); pelo §7 (d) do Design Doc
   *            `fechamento-diario-api.md` vale o encerrante, e a troca foi feita aqui.
   *          O que NÃO mudou: a entrada continua sendo `bico.combustivel.preco_venda`.
   *          A divergência de R$ 23.784,61 de janeiro é de PREÇO, e está medida no
   *          golden novo (asserção e) e no Design Doc — esta troca não a apaga.
   *
   *          Sem venda apurada (`totalVendas === null`) não há termo de comparação: a
   *          diferença fica 0, que é o valor que a tela já trata como "sem conferência"
   *          (`FooterAcoes.tsx`, que decide o estado por `=== null`, não por `0`).
   *          Não altere sem rodar `bun run test:golden`.
   */
  const diferenca = useMemo(() => {
    const { totalVendas } = totaisLeituras;
    return totalVendas === null ? 0 : diferencaCanonica(totalVendas, totalFrentistas);
  }, [totalFrentistas, totaisLeituras]);

  /**
   * Diferença em percentual em relação ao total de vendas
   */
  const diferencaPercentual = useMemo(() => {
    const { totalVendas } = totaisLeituras;
    return totalVendas === null ? 0 : calcularPercentual(Math.abs(diferenca), totalVendas);
  }, [diferenca, totaisLeituras]);

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
   * Validação: verifica se alguma sessão impede o fechamento.
   *
   * @remarks [19/08] A linha intocada (sem valor e sem encerrante) deixou de contar
   *          como erro: o painel semeia uma por frentista ativo, e quem não
   *          trabalhou no dia travava o botão Salvar do dia inteiro. O critério
   *          do que bloqueia mora em {@link sessaoBloqueiaFechamento} — puro e
   *          coberto por `fechamentoMeios.test.ts`.
   */
  const temFrentistasVazios = useMemo(() => {
    return sessoesFrentistas.some(sessaoBloqueiaFechamento);
  }, [sessoesFrentistas]);

  /**
   * Validação geral: pode fechar?
   *
   * @remarks
   * Critérios:
   * - Não ter leituras inválidas
   * - Nenhuma sessão bloqueando (valor sem dono, encerrante sem declaração)
   * - Ter pelo menos uma leitura
   * - Ter pelo menos uma sessão com movimento (linha semeada vazia não conta)
   */
  const podeFechar = useMemo(() => {
    return (
      !temLeiturasInvalidas &&
      !temFrentistasVazios &&
      Object.keys(leituras).length > 0 &&
      sessoesFrentistas.some(fs => !sessaoSemMovimento(fs))
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
      totalLitros: formatarParaBR(totaisLeituras.totalLitros, 3),
      // Dia não apurado não tem número para mostrar: '—', não "R$ 0,00".
      totalVendas: totaisLeituras.totalVendas === null ? '—' : formatarReais(totaisLeituras.totalVendas),
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
    totalLitros: totaisLeituras.totalLitros,
    totalVendas: totaisLeituras.totalVendas,
    totalFrentistas,
    totalPagamentos,

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
