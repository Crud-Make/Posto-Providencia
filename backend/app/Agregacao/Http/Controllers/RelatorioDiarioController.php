<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Controllers;

use App\Agregacao\Application\RelatorioDoDia;
use App\Agregacao\Http\Requests\RelatorioDiarioRequest;
use App\Agregacao\Http\Resources\RelatorioDiarioResource;

/**
 * `GET /api/postos/{posto}/relatorio-diario?data=` — fechamentos e despesas do dia para o
 * Relatório Diário do painel. O posto vem do `DefinePostoAtual`; o controller não conhece tabela.
 */
final class RelatorioDiarioController
{
    public function __construct(private readonly RelatorioDoDia $relatorioDoDia) {}

    public function show(RelatorioDiarioRequest $request): RelatorioDiarioResource
    {
        $dia = $request->dia();

        return new RelatorioDiarioResource(($this->relatorioDoDia)($dia), $dia);
    }
}
