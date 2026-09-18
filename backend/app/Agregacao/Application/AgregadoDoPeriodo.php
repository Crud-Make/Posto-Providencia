<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

/**
 * Resultado de {@see DadosDoPeriodo}: os insumos brutos de um período para o cálculo de lucro
 * que vive em `packages/utils/src/lucro.ts` (Design Doc agregacao.md §5).
 *
 * Não existe `custo_taxas`: a taxa de cartão é uma despesa lançada e já está dentro de
 * `rateio->despesasTotal` (DECISÃO 3). Não existe lucro: quem calcula é o cliente (DECISÃO 1).
 *
 * Duas janelas convivem aqui: a venda por produto é do PERÍODO EXATO; a compra por produto e o
 * `rateio` (despesa + litros) são do MÊS CIVIL que contém o período ({@see Periodo::mesCivil()}),
 * por decisão do dono em 18/09/2026.
 */
final readonly class AgregadoDoPeriodo
{
    /** @param list<ProdutoAgregado> $produtos ordenados por nome do combustível */
    public function __construct(
        public Periodo $periodo,
        public array $produtos,
        /** Despesa e litros do mês civil, para `despesaOperacionalPorLitro` no cliente. */
        public RateioDoMesCivil $rateio,
    ) {}
}
