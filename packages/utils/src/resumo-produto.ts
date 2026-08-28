/**
 * Resumo do mês por produto — o bloco `Venda` da aba de resumo da planilha.
 *
 * @remarks
 * Módulo puro, sem I/O. É a **composição** de três coisas que já existem, não uma
 * fórmula nova:
 *
 * - o acumulado por bico vem de `@posto/utils/encerrante-mensal`;
 * - o lucro vem de `@posto/utils/lucro` (`lucroCombustivel`), que já modela
 *   `lucro_lt = preço − custo_médio_compra − despesa_operacional_por_litro`;
 * - a margem vem de `margemPercentual`.
 *
 * O que este módulo acrescenta é o que a planilha mostra e o painel não tinha:
 * a **quebra por bico e por produto**, com participação no volume.
 *
 * ## Bico ≠ produto
 *
 * Três bicos vendem Gasolina Comum (01, 05 e 06). A planilha soma os litros dos
 * três numa coluna própria (`Produto, Vedindo.`) e só então calcula a
 * participação (`Produto,%`) — em janeiro, 29.007,79 L de comum sobre 46.843,062
 * do mês, 61,9%. Calcular participação por bico daria três fatias de ~20% e
 * esconderia que a comum é dois terços da operação. Por isso
 * {@link ResumoProdutos} devolve as duas visões, e a participação mora **só** na
 * agregação por produto.
 *
 * ## Divergência conhecida com a planilha — a mesma do encerrante mensal
 *
 * A planilha calcula a venda do mês como `litros do mês × UM preço só`, digitado
 * à mão. Aqui o preço é o **médio ponderado** dos dias realmente lançados, e a
 * venda é a soma do que entrou dia a dia. Em janeiro/2026 isso é R$ 290.062,92
 * (real, dia a dia) contra R$ 292.400,60 (planilha, preço único) — com litros
 * idênticos ao mililitro nos dois. Em março o Bico 01 teve 9 preços distintos.
 * Decisão registrada em `encerrante-mensal.golden.spec.ts` e mantida aqui: quem
 * manda é o dinheiro que entrou, e a divergência fica travada no golden.
 *
 * @module @posto/utils/resumo-produto
 */

import { emCentavos, lucroCombustivel, margemPercentual } from './lucro';

/** Acumulado de um bico no mês, pronto para receber custo e despesa. */
export interface EntradaBicoMes {
    /** Rótulo do bico, como aparece na planilha (`G,C. Bico 01`). */
    readonly bico: string;
    /** Produto que o bico vende. É o que agrupa (`G,Comum.`). */
    readonly produto: string;
    /** Encerrante no início do mês. */
    readonly inicial: number | null;
    /** Encerrante no fim do mês. */
    readonly fechamento: number | null;
    /** Litros vendidos no mês — salto do encerrante. */
    readonly litros: number;
    /** Faturamento do mês nesse bico, em reais. */
    readonly venda: number;
    /** Preço médio ponderado do mês (R$/L). `null` quando não houve venda. */
    readonly precoMedio: number | null;
    /**
     * Custo médio de compra do produto no mês (R$/L).
     *
     * @remarks `null` quando **não houve compra no período** — e aí o lucro não é
     *          apurável. Não caia na tentação de usar o `preco_custo` do cadastro
     *          como substituto: ele guarda um preço só, o de hoje, e aplicá-lo a
     *          um mês passado é exatamente o bug do "preço único" que inflou a
     *          venda histórica em 8–11%. Custo desconhecido tem que aparecer como
     *          desconhecido.
     */
    readonly custoMedio: number | null;
}

/** Uma linha da tabela por bico. */
export interface LinhaBico {
    readonly bico: string;
    readonly produto: string;
    readonly inicial: number | null;
    readonly fechamento: number | null;
    readonly litros: number;
    readonly precoMedio: number | null;
    readonly venda: number;
    /** `preço − custo_médio − despesa_por_litro`. `null` sem preço ou sem custo. */
    readonly lucroLitro: number | null;
    /** Lucro do bico no mês, em reais. Zero quando não é apurável — ver {@link apurado}. */
    readonly lucro: number;
    /** `lucro ÷ venda × 100`. */
    readonly margem: number;
    /**
     * `false` quando faltou preço ou custo e o lucro não pôde ser apurado.
     *
     * @remarks A tela precisa distinguir "lucrou zero" de "não dá para saber".
     *          Sem essa marca, produto sem compra no mês apareceria como produto
     *          que não deu lucro nenhum.
     */
    readonly apurado: boolean;
}

/** Uma linha da tabela por produto — é aqui que mora a participação. */
export interface LinhaProduto {
    readonly produto: string;
    /** Bicos que vendem este produto, na ordem em que apareceram. */
    readonly bicos: readonly string[];
    readonly litros: number;
    readonly venda: number;
    readonly lucro: number;
    readonly margem: number;
    /** Preço médio ponderado do produto (R$/L). `null` sem venda. */
    readonly precoMedio: number | null;
    /** Participação no volume do mês, em % dos litros. */
    readonly participacaoLitros: number;
    /** `false` quando algum bico do produto ficou sem preço ou sem custo. */
    readonly apurado: boolean;
}

/** Totais do mês — a linha `Total e Media ->` da planilha. */
export interface TotaisMes {
    readonly litros: number;
    readonly venda: number;
    readonly lucro: number;
    readonly margem: number;
    /** Preço médio ponderado do mês inteiro (R$/L). `null` sem venda. */
    readonly precoMedio: number | null;
    /** Despesa operacional rateada por litro (R$/L) usada no cálculo. */
    readonly despesaPorLitro: number;
}

export interface ResumoProdutos {
    readonly bicos: readonly LinhaBico[];
    readonly produtos: readonly LinhaProduto[];
    readonly totais: TotaisMes;
    /**
     * `false` quando algum bico com venda ficou sem preço ou sem custo.
     *
     * @remarks Com isso em `false`, o lucro total exibido está **incompleto** — é
     *          a soma só do que deu para apurar. A tela precisa dizer isso, senão
     *          o dono lê um lucro menor como se fosse o resultado do mês.
     */
    readonly apurado: boolean;
    /**
     * `false` quando não há despesa lançada no mês.
     *
     * @remarks Sem isso a tela exibiria lucro bruto como se fosse lucro real — o
     *          mesmo erro que o painel já cometeu e que `ResumoFinanceiro.temDespesa`
     *          existe para evitar. Ausência de despesa precisa aparecer como
     *          ausência, nunca como lucro alto.
     */
    readonly temDespesa: boolean;
}

/** Litros somados em mililitro inteiro — encerrante tem 3 casas exatas. */
const somaLitros = (valores: readonly number[]): number =>
    valores.reduce((acc, v) => acc + Math.round(v * 1000), 0) / 1000;

/**
 * Monta o resumo do mês por bico e por produto.
 *
 * @param entradas - Acumulado de cada bico no mês, já com o custo médio do produto.
 * @param despesaPorLitro - Rateio da despesa operacional (R$/L). Vem de
 *        `despesaOperacionalPorLitro(despesasDoMês, litrosDoMês)` — o mesmo número
 *        que o painel já exibe, para as duas visões nunca divergirem.
 * @param temDespesa - `false` quando o mês não tem nenhuma despesa lançada.
 *
 * @remarks A despesa entra **rateada por litro**, não subtraída do total no fim.
 *          A distributiva dá no mesmo no total, mas só o rateio permite dizer
 *          quanto cada produto lucrou — que é a pergunta que esta tabela responde.
 */
export function resumoPorProduto(
    entradas: readonly EntradaBicoMes[],
    despesaPorLitro: number,
    temDespesa: boolean
): ResumoProdutos {
    const bicos: LinhaBico[] = entradas.map((e) => {
        // Preço ou custo faltando = lucro não apurável. Tratar qualquer um dos dois
        // como zero produziria número plausível e errado — o pior tipo de saída.
        const apurado = e.precoMedio !== null && e.custoMedio !== null;
        const lucro = apurado
            ? lucroCombustivel({
                  litros: e.litros,
                  precoVenda: e.precoMedio as number,
                  custoMedio: e.custoMedio as number,
                  despesaOperacionalLitro: despesaPorLitro,
              })
            : 0;

        return {
            bico: e.bico,
            produto: e.produto,
            inicial: e.inicial,
            fechamento: e.fechamento,
            litros: e.litros,
            precoMedio: e.precoMedio,
            venda: emCentavos(e.venda),
            lucroLitro: apurado
                ? (e.precoMedio as number) - (e.custoMedio as number) - despesaPorLitro
                : null,
            lucro,
            margem: margemPercentual(lucro, e.venda),
            apurado,
        };
    });

    const litrosTotais = somaLitros(bicos.map((b) => b.litros));

    // A ordem de inserção do Map preserva a ordem dos bicos — a planilha lista os
    // produtos na ordem em que o primeiro bico de cada um aparece.
    const porProduto = new Map<string, LinhaBico[]>();
    for (const linha of bicos) {
        const atual = porProduto.get(linha.produto);
        if (atual) atual.push(linha);
        else porProduto.set(linha.produto, [linha]);
    }

    const produtos: LinhaProduto[] = [...porProduto.entries()].map(([produto, linhas]) => {
        const litros = somaLitros(linhas.map((l) => l.litros));
        const venda = emCentavos(linhas.reduce((acc, l) => acc + l.venda, 0));
        const lucro = emCentavos(linhas.reduce((acc, l) => acc + l.lucro, 0));

        return {
            produto,
            bicos: linhas.map((l) => l.bico),
            litros,
            venda,
            lucro,
            margem: margemPercentual(lucro, venda),
            precoMedio: litros > 0 ? venda / litros : null,
            participacaoLitros: litrosTotais > 0 ? (litros / litrosTotais) * 100 : 0,
            // Um bico não apurado contamina o produto inteiro: o lucro exibido seria
            // a soma de dois bicos onde deveriam ser três.
            apurado: linhas.every((l) => l.apurado || l.litros === 0),
        };
    });

    const venda = emCentavos(bicos.reduce((acc, b) => acc + b.venda, 0));
    const lucro = emCentavos(bicos.reduce((acc, b) => acc + b.lucro, 0));

    return {
        bicos,
        produtos,
        totais: {
            litros: litrosTotais,
            venda,
            lucro,
            margem: margemPercentual(lucro, venda),
            precoMedio: litrosTotais > 0 ? venda / litrosTotais : null,
            despesaPorLitro,
        },
        apurado: bicos.every((b) => b.apurado || b.litros === 0),
        temDespesa,
    };
}
