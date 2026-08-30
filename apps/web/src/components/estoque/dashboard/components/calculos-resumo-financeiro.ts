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

