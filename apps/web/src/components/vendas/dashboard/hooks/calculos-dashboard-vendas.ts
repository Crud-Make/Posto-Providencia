/**
 * O "Lucro Estimado" do DASHBOARD DE VENDAS — sítio 3.4 do saneamento.
 *
 * [onda 3, grupo B] Consolidado na canônica de `@posto/utils/lucro`:
 * `lucro = receita − litros × (custo_médio + despesa_operacional_por_litro)`.
 * A versão legada ignorava a despesa operacional — R$ 18,5 mil a R$ 35,5 mil
 * por mês no dado real de 2026, R$ 195.230,40 nos 7 meses de lucro mostrado a
 * mais. O antes/depois está travado no golden ao lado.
 *
 * [03/09/2026] O custo por litro passou a ser a COMPRA DO MÊS por produto
 * (`custoMedioCompra`, canônico da planilha) — ver `services/custo-do-mes.ts`;
 * o carimbo `Estoque.custo_medio` (média ponderada) deixou de ser gravado.
 * Produto vendido sem compra no mês não tem custo: o lucro do card vira `null`
 * e a tela diz qual produto faltou. Antes entrava com custo 0 — lucro de 100%
 * em silêncio. Os litros dele continuam no rateio da despesa.
 */
import {
    despesaOperacionalPorLitro,
    emCentavos,
    lucroCombustivel,
    margemPercentual,
} from '@posto/utils';

/** Um combustível agregado no mês, como o hook o monta. */
export interface ItemLucroDashboard {
    /** Nome do produto — volta em `produtosSemCompra`. */
    readonly produto: string;
    /** Litros vendidos no mês. */
    readonly litros: number;
    /** Receita real do produto no mês (Σ `Leitura.valor_total`), em reais. */
    readonly valor: number;
    /** R$/L da compra do mês (`custoMedioCompra`); `null` sem compra no mês. */
    readonly custoMedio: number | null;
}

/** Resultado do card. `null` = custo não apurável (ver `produtosSemCompra`). */
export interface LucroEstimadoDashboard {
    readonly profit: number | null;
    readonly margin: number | null;
    /** Produtos vendidos no mês sem compra para custear. */
    readonly produtosSemCompra: readonly string[];
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

    const produtosSemCompra: string[] = [];
    let soma = 0;
    for (const i of itens) {
        if (i.litros <= 0) continue;
        if (i.custoMedio === null) {
            produtosSemCompra.push(i.produto);
            continue;
        }
        soma += lucroCombustivel({
            litros: i.litros,
            precoVenda: i.valor / i.litros,
            custoMedio: i.custoMedio,
            despesaOperacionalLitro: despLt,
        });
    }
    if (produtosSemCompra.length > 0) {
        return { profit: null, margin: null, produtosSemCompra };
    }

    const profit = emCentavos(soma);
    const totalVendas = itens.reduce((s, i) => s + i.valor, 0);
    return { profit, margin: margemPercentual(profit, totalVendas), produtosSemCompra };
}
