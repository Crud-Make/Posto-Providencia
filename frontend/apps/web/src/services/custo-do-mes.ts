/**
 * Custo médio de compra do mês, por combustível — a fonte canônica das telas de lucro.
 *
 * @remarks
 * Até 03/09/2026 o `/dashboard`, a `/analise-custos` e o `/vendas/dashboard` liam o
 * carimbo `Estoque.custo_medio`, gravado pela média ponderada com estoque anterior a cada
 * compra (`custoMedioPonderado`, legada). A planilha custeia a venda pela compra do MESMO
 * mês (`custoMedioCompra`, F16 = E16/D16); a diferença chegou a R$ 2.582 num mês. Este
 * módulo é o que as três telas passam a usar, e o carimbo deixou de ser gravado.
 *
 * Mês sem compra de um produto vendido → `null`, nunca zero: zero seria "comprado de
 * graça" e inflaria o lucro em silêncio. A tela mostra traço e diz qual produto.
 */
import { custoMedioCompra, type CompraDoProduto } from '@posto/utils';

/** As colunas de `Compra` que a conta precisa. */
export interface CompraParaCusto {
  readonly combustivel_id: number | null;
  readonly quantidade_litros: number;
  readonly valor_total: number;
}

/** Compras agrupadas por `combustivel_id`, no formato que `custoMedioCompra` consome. */
export function comprasPorCombustivel(
  compras: readonly CompraParaCusto[]
): Map<number, CompraDoProduto[]> {
  const porCombustivel = new Map<number, CompraDoProduto[]>();
  for (const c of compras) {
    if (c.combustivel_id === null) continue;
    const lista = porCombustivel.get(c.combustivel_id) ?? [];
    lista.push({ litros: Number(c.quantidade_litros) || 0, valorTotal: Number(c.valor_total) || 0 });
    porCombustivel.set(c.combustivel_id, lista);
  }
  return porCombustivel;
}

/**
 * Custo médio de compra (R$/L) por `combustivel_id`, a partir das compras do mês.
 *
 * @returns Função de consulta: `null` para combustível sem compra no mês.
 */
export function custoMedioPorCombustivel(
  compras: readonly CompraParaCusto[]
): (combustivelId: number) => number | null {
  const porCombustivel = comprasPorCombustivel(compras);
  return (combustivelId) => custoMedioCompra(porCombustivel.get(combustivelId) ?? []);
}
