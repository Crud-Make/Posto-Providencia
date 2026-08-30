/**
 * A conta de lucro por produto da ANÁLISE DE VENDAS — sítio 3.3 do saneamento.
 *
 * [onda 3, grupo B] CONSOLIDADA na canônica de `@posto/utils/lucro`:
 * `linhaLucroProduto` delega a `lucroCombustivel`/`margemPercentual`, e o
 * serviço passou a alimentá-la com o custo da COMPRA DO PRÓPRIO MÊS
 * (`custoMedioCompra`) em vez do carimbo `Estoque.custo_medio` (média
 * ponderada com estoque anterior) — que deslocava o lucro do mês em até
 * R$ 2.582 (abril/2026). O carimbo ficou só como fallback de mês sem compra
 * lançada. Antes/depois travado no golden ao lado.
 */
import {
    despesaOperacionalPorLitro,
    lucroCombustivel,
    margemPercentual,
} from '@posto/utils';

/** Um produto agregado no mês, como o serviço monta a partir das leituras. */
export interface EntradaLinhaProduto {
    /** Litros vendidos do produto no mês. */
    readonly litros: number;
    /** Receita real do produto no mês (Σ `Leitura.valor_total`), em reais. */
    readonly valor: number;
    /** R$/L — custo da compra do MÊS (`custoMedioCompra`); carimbo só como fallback. */
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

/** Despesa operacional por litro vendido no mês — delega à canônica. */
export function despesaPorLitroVendido(totalDespesas: number, litrosVendidos: number): number {
    return despesaOperacionalPorLitro(totalDespesas, litrosVendidos);
}

/** A linha da tela: preço praticado → sugerido → lucro (canônico) → margem. */
export function linhaLucroProduto(e: EntradaLinhaProduto): LinhaLucroProduto {
    // 1. Preço Praticado (receita real ÷ litros; cadastro só sem litro no mês)
    const precoPraticado = e.litros > 0 ? e.valor / e.litros : e.precoVendaCadastro;

    // 2. Valor para Venda Sugerido = Custo Médio do mês + Despesa/Litro
    const suggestedPrice = e.custoMedio + e.despesaPorLitro;

    // 3. Lucro por Litro (não é dinheiro final → sem quantizar)
    const profitPerLiter = precoPraticado - suggestedPrice;

    // 4. Lucro Total — canônico, quantizado em centavos na saída
    const lucroTotal = lucroCombustivel({
        litros: e.litros,
        precoVenda: precoPraticado,
        custoMedio: e.custoMedio,
        despesaOperacionalLitro: e.despesaPorLitro,
    });

    // 5. Margem canônica: lucro ÷ receita. Sem litro no mês, mantém a margem
    // hipotética por litro sobre o preço de cadastro (comportamento da tela).
    const margin =
        e.litros > 0
            ? margemPercentual(lucroTotal, e.valor)
            : precoPraticado > 0
              ? (profitPerLiter / precoPraticado) * 100
              : 0;

    // Custo Total Visualização (Custo Médio * Volume)
    const cmv = e.litros * e.custoMedio;

    return { precoPraticado, suggestedPrice, profitPerLiter, lucroTotal, margin, cmv };
}
