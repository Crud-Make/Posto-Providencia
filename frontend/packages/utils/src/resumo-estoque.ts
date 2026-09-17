/**
 * Resumo do mês por estoque — o bloco `Estoque` da aba de resumo.
 *
 * @remarks
 * Módulo puro, sem I/O. É o único lugar do sistema que responde **"sumiu
 * combustível?"**, e por isso é o mais perigoso de errar em silêncio: o número
 * que ele produz acusa perda física, e perda física acusa gente.
 *
 * Fórmulas confirmadas célula a célula contra a planilha real (mês 01/2026):
 *
 *     compra_e_estoque = estoque_anterior + litros_comprados
 *     estoque_teorico  = compra_e_estoque − litros_vendidos
 *     perca_ou_sobra   = estoque_medido_no_tanque − estoque_teorico
 *
 * O sinal segue a planilha e é o **inverso** do da diferença de caixa:
 * **negativo = PERDA** (falta combustível no tanque), **positivo = SOBRA**.
 * Em janeiro/2026 a Gasolina Comum fechou em −3.712,21 L.
 *
 * ⚠️ `estoqueMedido` é **medição física de régua/tanque**, digitada por alguém —
 * não sai de cálculo nenhum. Sem ela não existe perda apurável, e é por isso que
 * {@link LinhaEstoque.percaOuSobra} vem `null`, nunca zero: "não medi" e "não
 * perdi" são estados diferentes, e confundi-los transforma tanque não conferido
 * em tanque conferido e certo.
 *
 * @module @posto/utils/resumo-estoque
 */

/** Movimento de estoque de um produto no mês. */
export interface EntradaEstoqueProduto {
    readonly produto: string;
    /** Estoque no início do período, em litros. */
    readonly estoqueAnterior: number;
    /** Litros comprados no mês. */
    readonly litrosComprados: number;
    /** Litros vendidos no mês (salto do encerrante). */
    readonly litrosVendidos: number;
    /**
     * Litros medidos fisicamente no tanque ao fim do período.
     * `null` quando ninguém mediu — e aí não há perda a apurar.
     */
    readonly estoqueMedido: number | null;
}

/** Uma linha da tabela de estoque. */
export interface LinhaEstoque {
    readonly produto: string;
    readonly estoqueAnterior: number;
    readonly litrosComprados: number;
    readonly litrosVendidos: number;
    /** `estoqueAnterior + litrosComprados`. */
    readonly compraEEstoque: number;
    /** `compraEEstoque − litrosVendidos` — o que deveria haver no tanque. */
    readonly estoqueTeorico: number;
    readonly estoqueMedido: number | null;
    /** `estoqueMedido − estoqueTeorico`. Negativo = PERDA. `null` sem medição. */
    readonly percaOuSobra: number | null;
    /** `|percaOuSobra| ÷ litrosVendidos × 100`. `null` sem medição ou sem venda. */
    readonly percentualSobreVenda: number | null;
}

export interface ResumoEstoque {
    readonly produtos: readonly LinhaEstoque[];
    readonly totais: LinhaEstoque;
    /** `true` quando algum produto fechou com perda (`percaOuSobra < 0`). */
    readonly temPerda: boolean;
    /** `true` quando algum produto não teve o tanque medido. */
    readonly temProdutoSemMedicao: boolean;
}

/**
 * Litro em mililitro inteiro.
 *
 * @remarks Não é preciosismo: `38392 − 29007.79` em float devolve
 *          `9384.210000000001`, e esse ruído entra direto na perda apurada —
 *          o número que aponta o dedo para alguém.
 */
const emMl = (litros: number): number => Math.round(litros * 1000);
const paraLitros = (ml: number): number => ml / 1000;

function montarLinha(e: EntradaEstoqueProduto): LinhaEstoque {
    const compraEEstoqueMl = emMl(e.estoqueAnterior) + emMl(e.litrosComprados);
    const teoricoMl = compraEEstoqueMl - emMl(e.litrosVendidos);
    const percaMl = e.estoqueMedido === null ? null : emMl(e.estoqueMedido) - teoricoMl;

    return {
        produto: e.produto,
        estoqueAnterior: e.estoqueAnterior,
        litrosComprados: e.litrosComprados,
        litrosVendidos: e.litrosVendidos,
        compraEEstoque: paraLitros(compraEEstoqueMl),
        estoqueTeorico: paraLitros(teoricoMl),
        estoqueMedido: e.estoqueMedido,
        percaOuSobra: percaMl === null ? null : paraLitros(percaMl),
        percentualSobreVenda:
            percaMl === null || e.litrosVendidos <= 0
                ? null
                : (Math.abs(paraLitros(percaMl)) / e.litrosVendidos) * 100,
    };
}

/**
 * Monta o resumo de estoque do mês.
 *
 * @remarks O total só apura perda quando **todos** os produtos foram medidos.
 *          Um tanque não medido no meio da lista tornaria o total um número
 *          parcial com cara de completo — e um total de perda pela metade é
 *          pior que total nenhum.
 */
export function resumoEstoque(
    entradas: readonly EntradaEstoqueProduto[]
): ResumoEstoque {
    const produtos = entradas.map(montarLinha);

    const soma = (pegar: (l: LinhaEstoque) => number): number =>
        paraLitros(produtos.reduce((acc, l) => acc + emMl(pegar(l)), 0));

    const todosMedidos =
        produtos.length > 0 && produtos.every((p) => p.estoqueMedido !== null);

    const totais = montarLinha({
        produto: 'Total',
        estoqueAnterior: soma((l) => l.estoqueAnterior),
        litrosComprados: soma((l) => l.litrosComprados),
        litrosVendidos: soma((l) => l.litrosVendidos),
        estoqueMedido: todosMedidos ? soma((l) => l.estoqueMedido as number) : null,
    });

    return {
        produtos,
        totais,
        temPerda: produtos.some((p) => p.percaOuSobra !== null && p.percaOuSobra < 0),
        temProdutoSemMedicao: produtos.some((p) => p.estoqueMedido === null),
    };
}
