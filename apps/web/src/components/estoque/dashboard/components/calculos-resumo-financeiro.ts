/**
 * As contas do card RESUMO FINANCEIRO do estoque — sítio 3.5 do saneamento.
 *
 * ⚠️ O "Lucro Previsto Estimado" é reimplementação LEGADA:
 * `estoque × (preco_venda − preco_custo)` do CADASTRO, sem despesa operacional
 * e sem o custo médio do mês. Movida (sem mudar a conta) para fora do `.tsx`
 * para que `calculos-resumo-financeiro.golden.spec.ts` a exercite lado a lado
 * com a canônica (§7). Divergência medida com o estoque real de julho/2026:
 * R$ 5.765,14 a mais em 9.628 L — a despesa operacional que o card não desconta.
 *
 * A consolidação no canônico é a onda 3 — não use este módulo em código novo.
 */

/** O que o card precisa de um tanque (estruturalmente compatível com `Tanque`). */
export interface TanqueParaResumo {
    /** Litros derivados no tanque (régua + compras − vendas). */
    readonly estoque_atual: number;
    readonly combustivel?: {
        readonly preco_custo?: number | null;
        readonly preco_venda?: number | null;
    } | null;
}

/** Valor bruto em estoque: `Σ estoque × preco_custo` do cadastro. */
export function valorBrutoEstoque(tanques: readonly TanqueParaResumo[]): number {
    return tanques.reduce((acc, t) => acc + t.estoque_atual * (t.combustivel?.preco_custo || 0), 0);
}

/**
 * "Lucro Previsto Estimado": `Σ estoque × (preco_venda − preco_custo)` do
 * cadastro — sem despesa operacional (a divergência que o golden congela) e
 * com o preço de custo de HOJE, não o custo médio do mês.
 */
export function lucroPrevistoEstoque(tanques: readonly TanqueParaResumo[]): number {
    return tanques.reduce(
        (acc, t) =>
            acc + t.estoque_atual * ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0)),
        0
    );
}
