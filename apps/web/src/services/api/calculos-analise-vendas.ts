/**
 * A conta de lucro por produto da ANÁLISE DE VENDAS — sítio 3.3 do saneamento.
 *
 * ⚠️ Reimplementação LEGADA do modelo canônico de `@posto/utils/lucro`, movida
 * (sem mudar a conta) para fora de `salesAnalysis.service.ts` para que
 * `calculos-analise-vendas.golden.spec.ts` a exercite lado a lado com a
 * canônica (§7: nada de consolidar sem teste contra todas as implementações).
 * As diferenças conhecidas, travadas no golden:
 *
 * - o custo vem do CARIMBO `Estoque.custo_medio` (média ponderada com estoque
 *   anterior — `custoMedioPonderado`), não da compra do mês: erra o lucro do
 *   mês em até R$ 2.582;
 * - não quantiza por `emCentavos`.
 *
 * A consolidação no canônico é a onda 3 do saneamento — não use este módulo
 * em código novo.
 */

/** Um produto agregado no mês, como o serviço monta a partir das leituras. */
export interface EntradaLinhaProduto {
    /** Litros vendidos do produto no mês. */
    readonly litros: number;
    /** Receita real do produto no mês (Σ `Leitura.valor_total`), em reais. */
    readonly valor: number;
    /** R$/L — o carimbo `Estoque.custo_medio` (é aqui que a conta diverge). */
    readonly custoMedio: number;
    /** R$/L de despesa rateada — ver {@link despesaPorLitroVendido}. */
    readonly despesaPorLitro: number;
    /** Preço de cadastro, usado só quando o mês não tem litros. */
    readonly precoVendaCadastro: number;
}

/** Linha calculada — os campos que o serviço devolve para a UI. */
export interface LinhaLucroProduto {
    readonly precoPraticado: number;
    readonly suggestedPrice: number;
    readonly profitPerLiter: number;
    readonly lucroTotal: number;
    readonly margin: number;
    readonly cmv: number;
}

/**
 * Despesa operacional por litro vendido no mês.
 *
 * @remarks Mesma conta de `despesaOperacionalPorLitro` (`@posto/utils`) — o
 *          golden afirma a igualdade. Mantida aqui porque o serviço inteiro
 *          ainda é a implementação legada.
 */
export function despesaPorLitroVendido(totalDespesas: number, litrosVendidos: number): number {
    return litrosVendidos > 0 ? totalDespesas / litrosVendidos : 0;
}

/** A "EXCEL LOGIC" do serviço, verbatim: preço praticado → sugerido → lucro → margem. */
export function linhaLucroProduto(e: EntradaLinhaProduto): LinhaLucroProduto {
    // 1. Preço Praticado (Actual Price)
    const precoPraticado = e.litros > 0 ? e.valor / e.litros : e.precoVendaCadastro;

    // 2. Valor para Venda Sugerido (Suggested Price) = Custo Médio + Despesa/Litro
    const suggestedPrice = e.custoMedio + e.despesaPorLitro;

    // 3. Lucro por Litro = Preço Praticado - Valor Sugerido
    const profitPerLiter = precoPraticado - suggestedPrice;

    // 4. Lucro Total = Lucro por Litro * Volume
    const lucroTotal = profitPerLiter * e.litros;

    // 5. Margem = Lucro por Litro / Preço Praticado
    const margin = precoPraticado > 0 ? (profitPerLiter / precoPraticado) * 100 : 0;

    // Custo Total Visualização (Custo Médio * Volume)
    const cmv = e.litros * e.custoMedio;

    return { precoPraticado, suggestedPrice, profitPerLiter, lucroTotal, margin, cmv };
}
