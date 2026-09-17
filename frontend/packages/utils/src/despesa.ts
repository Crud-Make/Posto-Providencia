/**
 * Soma de despesas do posto, à prova da linha de total.
 *
 * @remarks
 * As tabelas de despesa vindas do ETL (`despesa_categoria_mensal`, `despesa_trimestral`)
 * carregam a **linha de total da planilha misturada às linhas de detalhe**, como se total
 * fosse uma categoria. Isso é fiel à fonte — a planilha realmente tem essa linha — e o ETL
 * a preserva de propósito (`etl_stage1.py`, o ramo que rotula `__TOTAL__`).
 *
 * A consequência é uma armadilha silenciosa: **somar a coluna inteira devolve exatamente o
 * dobro**. Não um número estranho que salta aos olhos — o dobro certinho, que passa por
 * plausível. Descoberto em 31/07/2026 ao apurar o lucro real dos 7 meses de 2026:
 * `despesa_categoria_mensal` somava R$ 280.912,54 quando o valor certo é R$ 140.456,27.
 *
 * Por isso a filtragem mora aqui, no domínio, e não em cada `SELECT` espalhado: quem
 * somar despesa passa por {@link somarDespesas} e não tem como cair no dobro.
 *
 * @module @posto/utils/despesa
 */

/**
 * Rótulos que a planilha usa para a linha de total dentro da lista de categorias.
 *
 * @remarks `Total.` (com ponto) é como a planilha escreve na aba de despesa mensal;
 *          `__TOTAL__` é o sentinela que o ETL grava ao reconhecer a linha de total da
 *          aba trimestral. `Total` sem ponto entra por segurança — a planilha é digitada
 *          à mão e a pontuação varia.
 */
export const ROTULOS_DE_TOTAL: readonly string[] = ['Total', 'Total.', '__TOTAL__'];

/** Linha de despesa como sai do ETL. */
export interface LinhaDespesa {
    /** Rótulo da categoria — pode ser a linha de total disfarçada. */
    readonly categoria: string | null;
    /** Valor em reais. `null` quando a planilha deixou a célula vazia. */
    readonly valor: number | null;
}

/**
 * Diz se a linha é a **linha de total** da planilha, e não uma despesa de verdade.
 *
 * @remarks Compara sem diferenciar maiúscula/minúscula e ignorando espaço nas pontas,
 *          porque os rótulos são digitados à mão na planilha.
 */
export function ehLinhaDeTotal(categoria: string | null | undefined): boolean {
    if (!categoria) return false;
    const normalizada = categoria.trim().toLowerCase();
    return ROTULOS_DE_TOTAL.some((r) => r.toLowerCase() === normalizada);
}

/**
 * Soma as despesas descartando a linha de total.
 *
 * @param linhas - Linhas de despesa como vieram do ETL, com a linha de total no meio.
 * @returns Total em reais. Célula vazia (`null`) conta como zero.
 *
 * @example
 * ```ts
 * somarDespesas([
 *   { categoria: 'Frete', valor: 5640 },
 *   { categoria: 'Luz',   valor: 650 },
 *   { categoria: 'Total.', valor: 6290 }, // descartada
 * ]); // => 6290, não 12580
 * ```
 */
export function somarDespesas(linhas: readonly LinhaDespesa[]): number {
    return linhas.reduce(
        (soma, linha) => (ehLinhaDeTotal(linha.categoria) ? soma : soma + (linha.valor ?? 0)),
        0
    );
}
