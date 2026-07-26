/**
 * Cálculo canônico de lucro/margem de combustível (modelo da planilha Posto Jorro).
 *
 * @remarks
 * Fonte de verdade: skill fechamento-posto-providencia + planilha real 2026.
 * Modelo confirmado contra `docs/data/fixture_lucro_custo_mes01.json` (mês 01):
 *
 *   lucro_lt = preço_venda − custo_médio_compra − despesa_operacional_por_litro
 *   despesa_operacional_por_litro = despesas_totais_do_mês ÷ litros_vendidos_do_mês
 *
 * A "taxa de cartão" NÃO é uma dedução por transação: ela é apenas mais um item
 * da lista de despesas mensais que alimenta `despesaOperacionalPorLitro`.
 *
 * Tudo em reais; valores de dinheiro (lucro/receita) quantizados em centavos.
 *
 * @module @posto/utils/lucro
 */

/** Quantiza reais para precisão de centavos (evita drift de float). */
const emCentavos = (reais: number): number => Math.round(reais * 100) / 100;

/**
 * Despesa operacional por litro — rateio mensal (planilha: H22 = H19/F11).
 *
 * @param despesasTotais - Soma das despesas do mês (inclui taxa de cartão, quando lançada).
 * @param litrosVendidos - Litros vendidos no mês.
 * @returns R$/litro. Não é dinheiro final → mantém precisão total (não quantiza).
 */
export function despesaOperacionalPorLitro(
    despesasTotais: number,
    litrosVendidos: number
): number {
    return litrosVendidos > 0 ? despesasTotais / litrosVendidos : 0;
}

/** Entrada para o cálculo de lucro de um combustível. */
export interface LucroCombustivelInput {
    /** Litros vendidos. */
    litros: number;
    /** Preço de venda por litro (R$). */
    precoVenda: number;
    /** Custo médio de compra por litro (R$). */
    custoMedio: number;
    /** Despesa operacional rateada por litro (R$) — ver {@link despesaOperacionalPorLitro}. */
    despesaOperacionalLitro: number;
}

/**
 * Lucro de um combustível (em centavos):
 * `receita − litros × (custo_médio + despesa_operacional_por_litro)`.
 */
export function lucroCombustivel(i: LucroCombustivelInput): number {
    const receita = i.litros * i.precoVenda;
    const custoTotal = i.litros * (i.custoMedio + i.despesaOperacionalLitro);
    return emCentavos(receita - custoTotal);
}

/**
 * Margem percentual: `lucro / receita × 100`.
 *
 * @returns Percentual (0 se receita ≤ 0).
 */
export function margemPercentual(lucro: number, receita: number): number {
    return receita > 0 ? (lucro / receita) * 100 : 0;
}
