/**
 * O simulador de preço da ANÁLISE DE CUSTOS — sítio 3.6 do saneamento.
 *
 * Modelo de MARKUP: `preco = custo ÷ (1 − margem%)`. Movido (sem mudar a
 * conta) para fora de `useAnaliseCustos.ts` para que
 * `calculos-analise-custos.golden.spec.ts` o exercite lado a lado com a
 * canônica (§7). O que o golden provou, medido em julho/2026:
 *
 * - a "margem" deste modelo é margem SOBRE O PREÇO — exatamente a definição
 *   canônica `margemPercentual = lucro ÷ receita`. Alimentado com o custo
 *   total (custo médio + despesa/L) e a margem canônica do mês, ele devolve
 *   o preço de bomba praticado, e `calculateProfit` devolve o lucro canônico;
 * - a divergência é de INTERPRETAÇÃO, não de conta: quem digitar uma margem
 *   pensando "sobre o custo" recebe um preço maior (20% sobre custo 5,00 dá
 *   6,25 aqui, não 6,00) — e o teto arbitrário `margem ≥ 100% → custo × 10`
 *   é invenção da tela, sem contraparte canônica.
 */

/** Preço sugerido para uma margem (sobre o preço) desejada. */
export function calculatePrice(cost: number, marginPercent: number): number {
    if (marginPercent >= 100) return cost * 10;
    return cost / (1 - marginPercent / 100);
}

/** Lucro projetado ao praticar `suggestedPrice` sobre o custo total por litro. */
export function calculateProfit(suggestedPrice: number, costTotalL: number, volume: number): number {
    return (suggestedPrice - costTotalL) * volume;
}
