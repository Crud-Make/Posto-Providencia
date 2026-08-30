/**
 * O "Lucro Estimado" do DASHBOARD DE VENDAS — sítio 3.4 do saneamento.
 *
 * [onda 3, grupo B] Consolidado na canônica de `@posto/utils/lucro`:
 * `lucro = receita − litros × (custo_médio + despesa_operacional_por_litro)`.
 * A versão legada ignorava a despesa operacional — R$ 18,5 mil a R$ 35,5 mil
 * por mês no dado real de 2026, R$ 195.230,40 nos 7 meses de lucro mostrado a
 * mais. O antes/depois está travado no golden ao lado.
 *
 * O que fica igual, de propósito (não é a decisão deste commit):
 * - o custo por litro segue vindo do carimbo `Estoque.custo_medio` (média
 *   ponderada) — a fonte é a onda 3.9, decisão do dono;
 * - item sem estoque cadastrado entra na receita com custo 0 (o card sempre
 *   fez assim); os litros dele ENTRAM no rateio da despesa.
 */
import {
    despesaOperacionalPorLitro,
    emCentavos,
    lucroCombustivel,
    margemPercentual,
} from '@posto/utils';

/** Um combustível agregado no mês, como o hook o monta. */
export interface ItemLucroDashboard {
    /** Litros vendidos no mês. */
    readonly litros: number;
    /** Receita real do produto no mês (Σ `Leitura.valor_total`), em reais. */
    readonly valor: number;
    /** R$/L do carimbo `Estoque.custo_medio`; `null` quando não há estoque cadastrado. */
    readonly custoMedio: number | null;
}

/** Resultado do card: lucro estimado e margem média. */
export interface LucroEstimadoDashboard {
    readonly profit: number;
    readonly margin: number;
}

/**
 * A conta canônica do card: lucro por combustível somado, com a despesa do
 * mês rateada por litro vendido sobre TODOS os litros do mês.
 *
 * @param despesaDoMes - Total de despesas lançadas no mês (tabela `Despesa`).
 */
export function lucroEstimadoDashboard(
    itens: readonly ItemLucroDashboard[],
    despesaDoMes: number
): LucroEstimadoDashboard {
    const litrosTotal = itens.reduce((s, i) => s + i.litros, 0);
    const despLt = despesaOperacionalPorLitro(despesaDoMes, litrosTotal);

    const profit = emCentavos(
        itens.reduce(
            (s, i) =>
                s +
                lucroCombustivel({
                    litros: i.litros,
                    precoVenda: i.litros > 0 ? i.valor / i.litros : 0,
                    custoMedio: i.custoMedio ?? 0,
                    despesaOperacionalLitro: despLt,
                }),
            0
        )
    );

    const totalVendas = itens.reduce((s, i) => s + i.valor, 0);
    return { profit, margin: margemPercentual(profit, totalVendas) };
}
