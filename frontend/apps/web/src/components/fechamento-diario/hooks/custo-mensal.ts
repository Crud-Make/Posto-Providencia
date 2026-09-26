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
  emCentavos,
  type LeituraDiariaBico,
} from '@posto/utils';
import type { DashboardDaApi } from '../../../services/api/dashboard.api';

/** O que o custo precisa de um bico: o combustível dele (id e nome). `BicoComDetalhes` satisfaz. */
export interface BicoDoCusto {
  readonly combustivel: { readonly id: number; readonly nome: string };
}

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
  bicos: readonly BicoDoCusto[]
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
  bicos: readonly BicoDoCusto[]
): CustoMensal {
  const valoresDespesa = despesas.map(d => Number(d.valor));
  const despesaDoMes = valoresDespesa.reduce((acc, v) => acc + v, 0);

  return {
    custoMedioPorProduto: custoPorProduto(compras, bicos),
    despesaOperacionalLitro: despesaOperacionalPorLitro(despesaDoMes, litrosDoMes(leituras)),
    temDespesa: valoresDespesa.length > 0,
  };
}

/**
 * O mesmo {@link CustoMensal}, a partir do `GET /api/postos/{posto}/dashboard` do mês civil
 * (#103 P9 passo 3b, decisões do dono de 22/09/2026).
 *
 * Nenhuma fórmula nova: o custo por produto é `custoMedioCompra` sobre a compra somada de cada
 * produto (`produtos[].compras`), e o rateio é `despesaOperacionalPorLitro` com os litros do
 * `encerranteMensal` rodado sobre `leituras` — os mesmos litros do caminho Supabase, sem a D5,
 * porque aqui cada leitura entra com o dia real. `rateio.litros_vendidos` (Σ diário) NÃO é lido: a
 * D3 decide que os litros do rateio são os do encerrante (memória p9-custo-decisoes-22-09).
 *
 * A despesa é UM `Number` do decimal da API, quantizado por `emCentavos` — nunca soma em float.
 *
 * @param dash - Resposta da API pedida para o mês civil inteiro (`mesCivil`): o `dia` de cada
 *               leitura é o dia do mês, então o período não pode atravessar meses.
 * @param bicos - Bicos do posto; dão o nome do produto de cada `combustivel_id`.
 */
export function custoMensalDaApi(dash: DashboardDaApi, bicos: readonly BicoDoCusto[]): CustoMensal {
  const compras: LinhaCompraDoMes[] = dash.produtos.map(p => ({
    combustivel_id: p.combustivel_id,
    quantidade_litros: p.compras.litros,
    valor_total: p.compras.valor_total,
  }));

  const diarias: LeituraDiariaBico[] = dash.leituras.map(l => ({
    dia: Number(l.data.slice(8, 10)),
    bico: String(l.bico_id),
    inicial: Number(l.leitura_inicial),
    fechamento: Number(l.leitura_final),
    valorDia: null,
  }));

  const despesaDoMes = emCentavos(Number(dash.rateio.despesas_total));

  return {
    custoMedioPorProduto: custoPorProduto(compras, bicos),
    despesaOperacionalLitro: despesaOperacionalPorLitro(despesaDoMes, encerranteMensal(diarias).litros),
    temDespesa: despesaDoMes !== 0,
  };
}
