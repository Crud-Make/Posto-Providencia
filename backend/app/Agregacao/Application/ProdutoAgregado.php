<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

/**
 * Um combustível com movimento no período: o que vendeu (Leitura) e o que comprou (Compra).
 *
 * Dinheiro e volume são string decimal, exatamente como o Postgres devolve a soma em
 * `numeric` — nunca float (CLAUDE.md: dinheiro trafega como `"1234.56"`). Nenhum campo é
 * derivado: custo médio, custo dos litros e lucro são de `packages/utils/src/lucro.ts`
 * (Design Doc agregacao.md, DECISÃO 1).
 *
 * Produto vendido sem compra no mês civil chega com `comprasLitros = "0.000"` e
 * `comprasValorTotal = "0.00"` — dado como está, sem fallback para `Combustivel.preco_custo`
 * (DECISÃO 2). `custoMedioCompra()` do lado TS lê isso como "não apurável".
 *
 * A venda é do PERÍODO EXATO; a compra é do MÊS CIVIL que contém o período
 * ({@see Periodo::mesCivil()}, decisão do dono, 18/09/2026).
 */
final readonly class ProdutoAgregado
{
    public function __construct(
        public int $combustivelId,
        public string $produto,
        /** Σ `Leitura.litros_vendidos` no período exato, escala 3. */
        public string $litrosVendidos,
        /** Σ `Leitura.valor_total` no período exato, escala 2. */
        public string $receita,
        /** Σ `Compra.quantidade_litros` no mês civil que contém o período, escala 3. */
        public string $comprasLitros,
        /** Σ `Compra.valor_total` no mês civil que contém o período, escala 2. */
        public string $comprasValorTotal,
    ) {}
}
