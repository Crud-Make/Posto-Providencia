/**
 * As contas do card RESUMO FINANCEIRO do estoque — sítio 3.5 do saneamento.
 *
 * [onda 3, grupo B] O "Lucro Previsto Estimado" foi consolidado na projeção
 * canônica: `estoque × (preco_venda − preco_custo − despesa_operacional/L)`,
 * quantizado. Antes a despesa ficava fora — R$ 5.765,14 prometidos a mais
 * sobre o estoque real de julho/2026 (9.628 L), mais que o dobro do previsto
 * real. Antes/depois travado no golden ao lado.
 *
 * Divergência que FICA, documentada e não medida (decisão à parte): o custo é
 * o `preco_custo` de HOJE do cadastro, não o custo médio do mês.
 */
import { emCentavos } from '@posto/utils';

/** O que o card precisa de um tanque (estruturalmente compatível com `Tanque`). */
export interface TanqueParaResumo {
    /** Litros derivados no tanque (régua + compras − vendas). */
    readonly estoque_atual: number;
    readonly combustivel?: {
        readonly preco_custo?: number | null;
        readonly preco_venda?: number | null;
    } | null;
}

/** Valor bruto em estoque: `Σ estoque × preco_custo` do cadastro. */
export function valorBrutoEstoque(tanques: readonly TanqueParaResumo[]): number {
    return tanques.reduce((acc, t) => acc + t.estoque_atual * (t.combustivel?.preco_custo || 0), 0);
}

/**
 * "Lucro Previsto Estimado" — projeção canônica sobre o estoque atual:
 * `Σ estoque × (preco_venda − preco_custo − despesaLitro)`, em centavos.
 *
 * @param despesaLitro - Despesa operacional por litro do mês corrente
 *        (`despesaOperacionalPorLitro`); 0 quando o mês não tem despesa
 *        lançada ou não tem litro vendido — nunca um fixo (§6).
 */
export function lucroPrevistoEstoque(
    tanques: readonly TanqueParaResumo[],
    despesaLitro: number
): number {
    return emCentavos(
        tanques.reduce(
            (acc, t) =>
                acc +
                t.estoque_atual *
                    ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0) - despesaLitro),
            0
        )
    );
}


/**
 * Tanque com litros e sem custo informado (`null` ou ≤ 0): o valor e o lucro dele NÃO se sabem.
 *
 * @remarks Ensaio Jorro+BR (30/09/2026): o BR tinha custo 0 nos quatro combustíveis e o card prometia
 *          R$ 34.450 de lucro — a venda inteira. A conta estava certa; o custo é que não existia. O
 *          gerente agora informa o custo no cadastro do combustível (decisão do dono, 30/09) e, até
 *          lá, a tela diz que falta o custo em vez de inventar um número. Tanque vazio não pesa.
 */
export function faltaCusto(t: TanqueParaResumo): boolean {
    const custo = t.combustivel?.preco_custo;
    return t.estoque_atual > 0 && (custo === null || custo === undefined || custo <= 0);
}
