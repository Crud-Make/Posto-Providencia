/**
 * Média ponderada com estoque anterior — a fórmula LEGADA do caminho de escrita.
 *
 * ⚠️ NÃO é o custo canônico da planilha, e NÃO deve entrar em código novo.
 * O canônico é `custoMedioCompra` (`@posto/utils/lucro`): custo médio da compra
 * do PRÓPRIO mês, sem estoque anterior. Esta aqui é a conta que
 * `apps/web/src/services/api/compra.service.ts` grava em `Estoque.custo_medio`
 * a cada compra desde 21/12/2025 (`0ef4587`) — divergência conhecida de até
 * **R$ 2.582/mês** no lucro (R$ 132,69 nos 7 meses de 2026), travada por
 * `estoque-encadeamento.golden.spec.ts`.
 *
 * @remarks
 * Ela mora aqui por um único motivo: o §7 do CLAUDE.md proíbe consolidar
 * implementações duplicadas sem teste rodando contra TODAS elas, e
 * `packages/*` não pode importar de `apps/*` (§2) — então a fórmula subiu
 * (MOVE, sem mudar a conta) para que o golden exercite o código de produção
 * em vez de uma réplica. O destino dela — morrer em favor do canônico — é a
 * onda 3.9 do saneamento, decisão do dono, não desta função.
 *
 * Semântica preservada do original, na íntegra e de propósito:
 * - estoque anterior NEGATIVO entra na conta (não há clamp em zero);
 * - com `estoqueAnterior + litrosCompra ≤ 0`, devolve o custo da compra atual.
 * A réplica antiga do golden fazia diferente nas duas bordas (`Math.max(e, 0)`
 * e fallback no custo ANTERIOR) — no dado real de 2026 nada exercita as bordas
 * e os números empatam, mas a cópia e o original nunca foram a mesma conta.
 *
 * @module @posto/utils/custo-ponderado
 */

/** Entrada da média ponderada, nos termos do `Estoque` + `Compra` do banco. */
export interface CustoPonderadoInput {
    /** Litros no tanque ANTES da compra (`Estoque.quantidade_atual`). */
    readonly estoqueAnterior: number;
    /** R$/L carimbado antes da compra (`Estoque.custo_medio`, `0` quando nulo). */
    readonly custoMedioAnterior: number;
    /** Litros da compra que está entrando. */
    readonly litrosCompra: number;
    /** R$/L pago nesta compra (`valor_total ÷ quantidade_litros`). */
    readonly custoLitroCompra: number;
}

/**
 * Novo `custo_medio` após uma compra, ponderando o estoque anterior:
 * `(estoque × custoAnterior + litros × custoCompra) ÷ (estoque + litros)`.
 *
 * @returns R$/L a carimbar no estoque; o custo da própria compra quando o
 *          denominador não é positivo.
 */
export function custoMedioPonderado(i: CustoPonderadoInput): number {
    const totalValorAntigo = i.estoqueAnterior * i.custoMedioAnterior;
    const totalValorNovo = totalValorAntigo + i.litrosCompra * i.custoLitroCompra;
    const quantidadeTotal = i.estoqueAnterior + i.litrosCompra;
    return quantidadeTotal > 0 ? totalValorNovo / quantidadeTotal : i.custoLitroCompra;
}
