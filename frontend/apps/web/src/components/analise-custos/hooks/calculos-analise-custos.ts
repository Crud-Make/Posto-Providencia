/**
 * O simulador de preço da ANÁLISE DE CUSTOS — sítio 3.6 do saneamento.
 *
 * [onda 3, grupo A] O golden ao lado provou que o "markup" daqui nunca foi um
 * terceiro modelo: `custo ÷ (1 − margem%)` é a INVERSA da `margemPercentual`
 * canônica (margem sobre o preço). Consolidado: a conta agora DELEGA a
 * `precoParaMargem` e `lucroCombustivel` de `@posto/utils/lucro` — mesma
 * aritmética, um dono só, provado contra julho/2026.
 *
 * O que continua sendo da tela, de propósito:
 * - o teto `margem ≥ 100% → custo × 10`: guarda de UI contra a divergência da
 *   curva (margem 100% sobre o preço não tem preço finito). Sem contraparte
 *   canônica — preservado como estava;
 * - a ressalva de interpretação: a margem digitada é SOBRE O PREÇO. Quem
 *   pensar "20% sobre o custo" recebe um preço maior (6,25, não 6,00).
 */
import { lucroCombustivel, precoParaMargem } from '@posto/utils';

/** Preço sugerido para uma margem (sobre o preço) desejada. */
export function calculatePrice(cost: number, marginPercent: number): number {
    if (marginPercent >= 100) return cost * 10;
    return precoParaMargem(cost, marginPercent);
}

/**
 * Lucro projetado ao praticar `suggestedPrice` sobre o custo total por litro.
 *
 * @remarks Delegado à canônica com a despesa já embutida no custo total —
 *          quantizado em centavos na saída (`emCentavos`), como toda fórmula
 *          de dinheiro do pacote.
 */
export function calculateProfit(suggestedPrice: number, costTotalL: number, volume: number): number {
    return lucroCombustivel({
        litros: volume,
        precoVenda: suggestedPrice,
        custoMedio: costTotalL,
        despesaOperacionalLitro: 0,
    });
}
