/**
 * Preço médio ponderado do estoque de PRODUTO (loja/conveniência) — o sítio 8
 * da onda 2, tratado À PARTE dos combustíveis de propósito.
 *
 * É a mesma média ponderada móvel de `custoMedioPonderado` (`@posto/utils`),
 * mas sobre `Produto.preco_custo` — mercadoria de revenda, OUTRO domínio:
 * a planilha do posto não tem modelo de "custo do mês" para a loja, e média
 * ponderada móvel é o modelo usual de custeio de mercadoria. Por isso este
 * módulo NÃO é candidato automático à consolidação da onda 3 (que mata a
 * ponderada dos combustíveis) — trocar o custeio da loja seria decisão de
 * negócio própria, não arrasto da decisão dos tanques.
 *
 * Movida (sem mudar a conta) para fora de `stockService.ts` para que
 * `calculos-estoque-produto.test.ts` congele a semântica (§7). Bordas
 * preservadas do original, diferentes das do serviço de combustível:
 * - entrada sem `valor_unitario` (ou ≤ 0) NÃO mexe no custo;
 * - denominador ≤ 0 mantém o custo ANTERIOR (combustível cai no da compra).
 */

/**
 * Novo `preco_custo` após uma ENTRADA de mercadoria.
 *
 * @param valorUnitario - R$/un da entrada; ausente ou ≤ 0 mantém o custo atual.
 */
export function precoMedioPonderadoProduto(
    estoqueAtual: number,
    precoCustoAtual: number,
    quantidadeEntrada: number,
    valorUnitario?: number
): number {
    if (valorUnitario === undefined || valorUnitario <= 0) return precoCustoAtual;
    const totalValorAtual = estoqueAtual * precoCustoAtual;
    const totalValorEntrada = quantidadeEntrada * valorUnitario;
    const stockFinal = estoqueAtual + quantidadeEntrada;
    if (stockFinal <= 0) return precoCustoAtual;
    return (totalValorAtual + totalValorEntrada) / stockFinal;
}
