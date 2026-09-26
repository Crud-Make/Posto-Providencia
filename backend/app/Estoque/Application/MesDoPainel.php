<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use Carbon\CarbonImmutable;

/**
 * O mês corrente da tela de Tanques, em `AAAA-MM-DD` — o período do rateio de despesa que o card
 * "Lucro Previsto" desconta. É o mês LOCAL do painel (`hojeIso().slice(0, 7)`): quem diz qual é o
 * mês é o cliente, como hoje; o servidor só recorta.
 */
final readonly class MesDoPainel
{
    public function __construct(public string $inicio, public string $fim) {}

    /** @param  string  $mes  `AAAA-MM`, já validado pelo FormRequest */
    public static function de(string $mes): self
    {
        $inicio = new CarbonImmutable($mes.'-01 00:00:00', 'UTC');

        return new self($inicio->format('Y-m-d'), $inicio->endOfMonth()->format('Y-m-d'));
    }
}
