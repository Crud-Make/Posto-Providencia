/**
 * O "Lucro Estimado" do DASHBOARD DE VENDAS — sítio 3.4 do saneamento.
 *
 * ⚠️ Reimplementação LEGADA: `lucro = vendas − Σ litros × custo_medio`, SEM a
 * despesa operacional do mês — que no dado real de 2026 fica entre R$ 18,5 mil
 * e R$ 35,5 mil/mês. Movida (sem mudar a conta) para fora de
 * `useDashboardVendas.ts` para que `calculos-dashboard-vendas.golden.spec.ts`
 * a exercite lado a lado com a canônica de `@posto/utils/lucro` (§7).
 * O custo ainda vem do carimbo `Estoque.custo_medio` (ponderado), segunda
 * divergência, medida no golden da análise de vendas.
 *
 * A consolidação no canônico é a onda 3 — não use este módulo em código novo.
 */

/** Um combustível agregado no mês, com o custo que o hook achou no estoque. */
export interface ItemLucroDashboard {
    /** Litros vendidos no mês. */
    readonly litros: number;
    /** R$/L do carimbo `Estoque.custo_medio`; `null` quando não há estoque cadastrado. */
    readonly custoMedio: number | null;
}

/** Resultado do card: lucro estimado e margem média. */
export interface LucroEstimadoDashboard {
    readonly profit: number;
    readonly margin: number;
}

/**
 * A conta do card, verbatim do hook: soma o custo só de quem TEM estoque
 * cadastrado (item sem estoque entra na receita e não entra no custo) e
 * ignora a despesa operacional.
 */
export function lucroEstimadoDashboard(
    itens: readonly ItemLucroDashboard[],
    totalVendas: number
): LucroEstimadoDashboard {
    let totalCost = 0;
    itens.forEach((item) => {
        if (item.custoMedio !== null) {
            totalCost += item.litros * item.custoMedio;
        }
    });

    const profit = totalVendas - totalCost;
    const margin = totalVendas > 0 ? (profit / totalVendas) * 100 : 0;
    return { profit, margin };
}
