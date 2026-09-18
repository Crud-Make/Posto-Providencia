<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Controllers;

use App\Agregacao\Application\DadosDoPeriodo;
use App\Agregacao\Http\Requests\DashboardRequest;
use App\Agregacao\Http\Resources\DashboardResource;

/**
 * `GET /api/postos/{posto}/dashboard` — agregado bruto do período (Design Doc agregacao.md §4–5).
 * O posto vem do middleware `DefinePostoAtual`; o controller não conhece `posto_id` nem tabela.
 */
final class AgregacaoController
{
    public function __construct(private readonly DadosDoPeriodo $dadosDoPeriodo) {}

    public function dashboard(DashboardRequest $request): DashboardResource
    {
        return new DashboardResource(($this->dadosDoPeriodo)($request->periodo()));
    }
}
