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

/**
 * Quantiza reais para precisão de centavos (evita drift de float).
 *
 * @remarks É a fronteira de saída de toda fórmula de dinheiro do pacote: o
 *          cálculo corre em reais-float e o resultado final passa por aqui.
 *          Export único — não redeclare cópia privada em módulo novo
 *          (`useCaixaGeralMes` chegou a reimplementá-la à mão).
 */
export const emCentavos = (reais: number): number => Math.round(reais * 100) / 100;

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

/** Uma compra do período, já somada por produto. */
export interface CompraDoProduto {
    /** Litros comprados do produto no período. */
    litros: number;
    /** Valor total pago pelo produto no período (R$). */
    valorTotal: number;
}

/**
 * Custo médio de compra por litro, ponderado pelo volume (planilha: `F16 = E16/D16`).
 *
 * @returns R$/litro, ou `null` sem compra no período — nunca `0`, que se
 *          confundiria com "comprado de graça", e nunca o `preco_custo` do
 *          cadastro, que é um preço só, o de hoje (ver {@link EntradaBicoMes}
 *          em `@posto/utils/resumo-produto`, mesma ressalva).
 */
export function custoMedioCompra(compras: readonly CompraDoProduto[]): number | null {
    const litros = compras.reduce((acc, c) => acc + c.litros, 0);
    if (litros <= 0) return null;
    const valorTotal = compras.reduce((acc, c) => acc + c.valorTotal, 0);
    return valorTotal / litros;
}

/** Litros vendidos de um produto e as compras dele no MESMO período. */
export interface ProdutoDoPeriodo {
    /** Nome do produto — volta em `produtosSemCompra` para a tela dizer qual faltou. */
    readonly produto: string;
    /** Litros vendidos do produto no período. */
    readonly litrosVendidos: number;
    /** Compras do produto no período (ver {@link custoMedioCompra}). */
    readonly compras: readonly CompraDoProduto[];
}

/** Resultado de {@link custoLitrosVendidos}. */
export interface CustoLitrosVendidos {
    /**
     * R$ dos litros vendidos, cada produto ao seu custo médio de compra do período.
     * `null` quando algum produto vendido ficou sem compra — o custo não é apurável,
     * e um zero aqui viraria lucro inflado na tela.
     */
    readonly custo: number | null;
    /** Produtos com venda no período e nenhuma compra para custear. */
    readonly produtosSemCompra: readonly string[];
}

/**
 * Custo dos litros vendidos no período: `Σ litros_vendidos × custo_médio_compra`, por produto.
 *
 * @remarks É a parcela de custo do modelo da planilha (`lucro_lt = preço − custo_médio −
 *          despesa/L`) somada sobre o período — o que o card Receitas/Despesas precisa para
 *          "despesas totais" e "lucro". Nasceu em 03/09/2026 substituindo o carimbo
 *          `Fechamento.custo_combustiveis`, que a UI nunca gravou: ficava em 0 e o card
 *          somava despesa SEM o combustível, mostrando lucro líquido maior que o bruto.
 *          Produto sem venda não pesa (litros 0 → custo 0, com ou sem compra). Produto
 *          vendido sem compra derruba o total para `null` — regra do {@link custoMedioCompra}.
 *          Golden: `lucro.golden.spec.ts`, identidade `lucro = venda − custo − despesas` do mês 01.
 */
export function custoLitrosVendidos(produtos: readonly ProdutoDoPeriodo[]): CustoLitrosVendidos {
    const produtosSemCompra: string[] = [];
    let custo = 0;
    for (const p of produtos) {
        if (p.litrosVendidos <= 0) continue;
        const custoMedio = custoMedioCompra(p.compras);
        if (custoMedio === null) {
            produtosSemCompra.push(p.produto);
            continue;
        }
        custo += p.litrosVendidos * custoMedio;
    }
    return {
        custo: produtosSemCompra.length > 0 ? null : emCentavos(custo),
        produtosSemCompra,
    };
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

/**
 * Preço que entrega uma margem desejada SOBRE O PREÇO: `custo ÷ (1 − margem%)`.
 *
 * @param custoLitro - Custo total por litro (custo médio + despesa operacional/L).
 * @param margemPct - Margem desejada em % **sobre o preço** — a mesma definição
 *        de {@link margemPercentual} (`lucro ÷ receita`), da qual esta função é
 *        a inversa: `margemPercentual(preco − custo, preco)` devolve `margemPct`.
 * @returns R$/L. Não é dinheiro final → mantém precisão total (não quantiza).
 *
 * @remarks NÃO é markup sobre o custo: 20% sobre custo R$ 5,00 dá R$ 6,25 aqui
 *          (margem sobre preço), não R$ 6,00. Confirmado contra julho/2026 no
 *          golden `calculos-analise-custos.golden.spec.ts`: alimentada com o
 *          custo total e a margem canônica do mês, reconstrói o preço de bomba
 *          praticado. Diverge (→ Infinity) quando `margemPct ≥ 100` — quem
 *          chama decide o teto; a curva não tem contraparte física ali.
 */
export function precoParaMargem(custoLitro: number, margemPct: number): number {
    return custoLitro / (1 - margemPct / 100);
}
