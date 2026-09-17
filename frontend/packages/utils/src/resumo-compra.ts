/**
 * Resumo do mês por compra — o bloco `Compra e Custo.` da aba de resumo.
 *
 * @remarks
 * Módulo puro, sem I/O. Responde a pergunta que antecede o preço de bomba:
 * **por quanto o litro precisa sair para pagar o que ele custou.**
 *
 * Fórmulas confirmadas célula a célula contra a planilha real (mês 01/2026):
 *
 *     media_lt        = compra_reais ÷ compra_litros
 *     valor_pra_venda = media_lt + despesa_operacional_por_litro
 *     percentual      = despesa_operacional_por_litro ÷ valor_pra_venda
 *
 * O `Custo do LT R$` que a planilha exibe ao lado deste bloco **é** o
 * `despesaOperacionalPorLitro` de `@posto/utils/lucro` — mesma conta, mesmo
 * número (22.158,46 ÷ 46.843,062 = 0,4730361 em janeiro/2026). Não se recalcula
 * aqui: recebe-se pronto, para as duas telas nunca divergirem.
 *
 * ⚠️ `valor_pra_venda` é **piso, não preço sugerido**: cobre o custo de compra e
 * o rateio da despesa, e para exatamente aí. Vender nele dá lucro zero. O preço
 * de bomba é decisão do dono.
 *
 * @module @posto/utils/resumo-compra
 */
import { emCentavos } from './lucro';

/** Compra de um produto no mês, como sai do banco ou da planilha. */
export interface EntradaCompraProduto {
    readonly produto: string;
    /** Litros comprados no mês. */
    readonly litros: number;
    /** Valor pago no mês, em reais. */
    readonly valor: number;
}

/** Uma linha da tabela de compra. */
export interface LinhaCompra {
    readonly produto: string;
    readonly litros: number;
    readonly valor: number;
    /** Custo médio de compra (R$/L). `null` quando não houve compra. */
    readonly mediaLitro: number | null;
    /** Piso para cobrir compra + despesa rateada (R$/L). `null` sem compra. */
    readonly valorParaVenda: number | null;
    /** Quanto do `valorParaVenda` é despesa operacional, em %. */
    readonly percentualDespesa: number;
}

export interface ResumoCompra {
    readonly produtos: readonly LinhaCompra[];
    readonly totais: LinhaCompra;
    /** Despesa operacional rateada por litro usada nas contas (R$/L). */
    readonly despesaPorLitro: number;
    /** `false` quando não há despesa lançada — o piso sai subestimado. */
    readonly temDespesa: boolean;
}

/** Litros somados em mililitro inteiro, para não acumular ruído de float. */
const somaLitros = (valores: readonly number[]): number =>
    valores.reduce((acc, v) => acc + Math.round(v * 1000), 0) / 1000;

function montarLinha(
    produto: string,
    litros: number,
    valor: number,
    despesaPorLitro: number
): LinhaCompra {
    const mediaLitro = litros > 0 ? valor / litros : null;
    const valorParaVenda = mediaLitro === null ? null : mediaLitro + despesaPorLitro;

    return {
        produto,
        litros,
        valor: emCentavos(valor),
        mediaLitro,
        valorParaVenda,
        percentualDespesa:
            valorParaVenda !== null && valorParaVenda > 0
                ? (despesaPorLitro / valorParaVenda) * 100
                : 0,
    };
}

/**
 * Monta o resumo de compra do mês.
 *
 * @param entradas - Compra de cada produto no mês.
 * @param despesaPorLitro - Rateio da despesa operacional (R$/L), vindo de
 *        `despesaOperacionalPorLitro(despesasDoMês, litrosVENDIDOSnoMês)`.
 * @param temDespesa - `false` quando o mês não tem despesa lançada.
 *
 * @remarks O denominador do rateio é **litro vendido**, não litro comprado — os
 *          dois quase nunca são iguais no mês (em janeiro/2026: 46.843 vendidos
 *          contra 47.000 comprados). Trocar um pelo outro muda o piso de venda
 *          de todo produto, silenciosamente.
 */
export function resumoCompra(
    entradas: readonly EntradaCompraProduto[],
    despesaPorLitro: number,
    temDespesa: boolean
): ResumoCompra {
    const produtos = entradas.map((e) =>
        montarLinha(e.produto, e.litros, e.valor, despesaPorLitro)
    );

    const litrosTotais = somaLitros(produtos.map((p) => p.litros));
    const valorTotal = produtos.reduce((acc, p) => acc + p.valor, 0);

    return {
        produtos,
        totais: montarLinha('Total', litrosTotais, valorTotal, despesaPorLitro),
        despesaPorLitro,
        temDespesa,
    };
}
