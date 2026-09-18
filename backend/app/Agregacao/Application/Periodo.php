<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use DateTimeImmutable;

/**
 * Intervalo fechado de dias `[inicio, fim]`, ambos em `Y-m-d`, já validados pelo FormRequest.
 *
 * É a única entrada de {@see DadosDoPeriodo}. Fica em Application porque Http monta e
 * Application consome (Deptrac: Http → Application, nunca o contrário).
 */
final readonly class Periodo
{
    public function __construct(
        public string $inicio,
        public string $fim,
    ) {}

    /**
     * Mês civil que contém o período: do dia 1 do mês de `inicio` ao último dia do mês de `fim`.
     *
     * É a janela da COMPRA (decisão do dono, 18/09/2026): a planilha custeia a venda pela compra
     * do mês (`F16 = E16/D16`), e o `aggregator.service.ts` de hoje já lê a compra pelo
     * `mesCivil(dataInicio)`. Quando `inicio` e `fim` caem no mesmo mês, é o mesmo intervalo.
     */
    public function mesCivil(): self
    {
        return new self(
            inicio: (new DateTimeImmutable($this->inicio))->format('Y-m-01'),
            fim: (new DateTimeImmutable($this->fim))->format('Y-m-t'),
        );
    }
}
