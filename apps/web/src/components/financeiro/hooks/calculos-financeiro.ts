/**
 * Composição de despesas do card Receitas/Despesas da tela `/financeiro`.
 *
 * [onda 4.2, 28/08/2026] A taxa de cartão é DESPESA DO MÊS (decisão do dono,
 * 26/08; `packages/utils/src/lucro.ts:11-12`): quando lançada, ela mora na
 * tabela `Despesa` e já entra em `despesasOps`. Somar também o carimbo
 * `taxas_pagamento` do Fechamento descontava a taxa DUAS VEZES do resultado.
 * A parcela saiu — o antes/depois está travado em `calculos-financeiro.test.ts`.
 */

/** O que o card usa do resumo carimbado de lucro dos fechamentos. */
export interface ResumoLucroParaDespesas {
    /** Custo real dos litros vendidos no período (carimbo). */
    readonly custo_combustiveis: number;
    /** Faltas de caixa do período. */
    readonly faltas: number;
}

/**
 * Total de despesas do período mostrado no card.
 *
 * @param resumo - Carimbo dos fechamentos; `null` cai no somatório direto
 *        (despesas lançadas + compras do período).
 * @param despesasOps - Despesas lançadas na tabela `Despesa` (inclui a taxa de
 *        cartão quando lançada).
 * @param compras - Compras de combustível do período (fallback sem carimbo).
 */
export function despesasDoPeriodo(
    resumo: ResumoLucroParaDespesas | null,
    despesasOps: number,
    compras: number
): number {
    return resumo
        ? resumo.custo_combustiveis + resumo.faltas + despesasOps
        : despesasOps + compras;
}
