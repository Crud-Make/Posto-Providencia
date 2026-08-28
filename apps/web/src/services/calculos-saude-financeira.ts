/**
 * O "Saldo Operacional" dos insights de IA — sítio 3.7 do saneamento.
 *
 * ⚠️ Reimplementação LEGADA, auto-declarada "Simplificado":
 * `saldo = vendas − despesas`, SEM o custo do produto — que é ~82% da venda de
 * combustível. Em julho/2026 esta conta mostra R$ 189.312,05 onde o lucro real
 * é R$ 18.272,31: mais de 10× o lucro verdadeiro. Movida (sem mudar a conta)
 * para fora de `aiService.ts` para que
 * `calculos-saude-financeira.golden.spec.ts` a exercite lado a lado com a
 * canônica (§7). O rótulo na UI é "Saldo Operacional", não "Lucro" — mas o
 * insight "Saúde Financeira Estável" que ela sustenta lê como veredito de
 * lucratividade.
 *
 * A consolidação no canônico é a onda 3 — não use este módulo em código novo.
 */

/** `vendas − despesas`, sem custo de produto — a conta "Simplificado" do insight. */
export function saldoOperacionalSimplificado(totalVendas: number, totalDespesas: number): number {
    return totalVendas - totalDespesas;
}
