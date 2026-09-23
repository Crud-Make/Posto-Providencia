/**
 * Cálculo puro do custo do mês por produto e do rateio da despesa por litro.
 *
 * @remarks
 * #103 P9 passo 2: extraído de `useCustoMensal` sem trocar fórmula nenhuma — o hook só
 * busca as linhas e delega para cá. As fórmulas são as de `@posto/utils`
 * (`custoMedioCompra`, `despesaOperacionalPorLitro`, `encerranteMensal`); aqui só se
 * agrupa e se soma.
 *
 * Defeitos conhecidos mantidos DE PROPÓSITO (corrigir é outra fatia, com golden):
 * - a despesa é somada em float, sem `emCentavos`;
 * - toda leitura entra com `dia: 1` e na ordem em que o banco devolveu (D5), então o
 *   salto do encerrante depende dessa ordem.
 */
import {
  encerranteMensal,
  custoMedioCompra,
  despesaOperacionalPorLitro,
  type LeituraDiariaBico,
} from '@posto/utils';
import type { BicoComDetalhes } from '../../../types/fechamento';

/** Linha de `Leitura` como o hook a seleciona. Numeric do Postgres pode chegar como string. */
export interface LinhaLeituraDoMes {
  readonly bico_id: number;
  readonly leitura_inicial: number | string | null;
  readonly leitura_final: number | string | null;
  readonly valor_total: number | string | null;
}

/** Linha de `Compra` como o hook a seleciona. */
export interface LinhaCompraDoMes {
  readonly combustivel_id: number | null;
  readonly quantidade_litros: number | string | null;
  readonly valor_total: number | string | null;
}

/** Linha de `Despesa` como o hook a seleciona. A taxa de cartão é uma dessas linhas. */
export interface LinhaDespesaDoMes {
  readonly valor: number | string | null;
}

export interface CustoMensal {
  /** Custo médio de compra por litro, por nome de produto. `null` sem compra no mês. */
  readonly custoMedioPorProduto: Record<string, number | null>;
  /** Despesa do mês ÷ litros do mês; `0` sem litros. */
  readonly despesaOperacionalLitro: number;
  /** `false` quando o mês não tem nenhuma linha de despesa. */
  readonly temDespesa: boolean;
}

/** Litros do mês pela mesma agregação do Resumo Mensal (dia parcial de fora). */
function litrosDoMes(leituras: readonly LinhaLeituraDoMes[]): number {
  const diarias: LeituraDiariaBico[] = leituras.map(l => ({
    dia: 1, // D5: irrelevante para o total do mês, mas deixa o salto depender da ordem.
    bico: String(l.bico_id),
    inicial: l.leitura_inicial === null ? null : Number(l.leitura_inicial),
    fechamento: l.leitura_final === null ? null : Number(l.leitura_final),
    valorDia: l.valor_total === null ? null : Number(l.valor_total),
  }));
  return encerranteMensal(diarias).litros;
}

/** Custo médio por produto; todo produto dos bicos aparece, `null` quando não teve compra. */
function custoPorProduto(
  compras: readonly LinhaCompraDoMes[],
  bicos: readonly BicoComDetalhes[]
): Record<string, number | null> {
  const nomeProdutoPorCombustivelId = new Map(bicos.map(b => [b.combustivel.id, b.combustivel.nome]));

  const comprasPorProduto = new Map<string, { litros: number; valorTotal: number }[]>();
  for (const c of compras) {
    const produto = c.combustivel_id !== null ? nomeProdutoPorCombustivelId.get(c.combustivel_id) : undefined;
    if (produto === undefined || produto === '') continue;
    const lista = comprasPorProduto.get(produto) ?? [];
    lista.push({ litros: Number(c.quantidade_litros), valorTotal: Number(c.valor_total) });
    comprasPorProduto.set(produto, lista);
  }

  const resultado: Record<string, number | null> = {};
  for (const produto of new Set(nomeProdutoPorCombustivelId.values())) {
    resultado[produto] = custoMedioCompra(comprasPorProduto.get(produto) ?? []);
  }
  return resultado;
}

/**
 * Custo do mês por produto e despesa operacional rateada por litro.
 *
 * @param leituras - `Leitura` do posto na janela do mês.
 * @param compras - `Compra` do posto na janela do mês.
 * @param despesas - `Despesa` do posto na janela do mês.
 * @param bicos - Bicos do posto; dão o nome do produto de cada `combustivel_id`.
 */
export function calculaCustoMensal(
  leituras: readonly LinhaLeituraDoMes[],
  compras: readonly LinhaCompraDoMes[],
  despesas: readonly LinhaDespesaDoMes[],
  bicos: readonly BicoComDetalhes[]
): CustoMensal {
  const valoresDespesa = despesas.map(d => Number(d.valor));
  const despesaDoMes = valoresDespesa.reduce((acc, v) => acc + v, 0);

  return {
    custoMedioPorProduto: custoPorProduto(compras, bicos),
    despesaOperacionalLitro: despesaOperacionalPorLitro(despesaDoMes, litrosDoMes(leituras)),
    temDespesa: valoresDespesa.length > 0,
  };
}
