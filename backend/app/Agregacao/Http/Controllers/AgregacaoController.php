<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Controllers;

use App\Agregacao\Application\DadosDoPeriodo;
use App\Agregacao\Application\MovimentoDoPosto;
use App\Agregacao\Application\ResumoDoProprietario;
use App\Agregacao\Http\Requests\DashboardRequest;
use App\Agregacao\Http\Requests\ProprietarioRequest;
use App\Agregacao\Http\Resources\DashboardResource;
use App\Agregacao\Http\Resources\MovimentoResource;
use App\Agregacao\Http\Resources\ProprietarioResource;

/**
 * `GET /api/postos/{posto}/dashboard` — agregado bruto do período (Design Doc agregacao.md §4–5).
 * O posto vem do middleware `DefinePostoAtual`; o controller não conhece `posto_id` nem tabela.
 */
final class AgregacaoController
{
    public function __construct(
        private readonly DadosDoPeriodo $dadosDoPeriodo,
        private readonly ResumoDoProprietario $resumoDoProprietario,
        private readonly MovimentoDoPosto $movimentoDoPosto,
    ) {}

    public function dashboard(DashboardRequest $request): DashboardResource
    {
        return new DashboardResource(($this->dadosDoPeriodo)($request->periodo()));
    }

    /** `GET /api/postos/{posto}/proprietario` — insumos da Visão do Proprietário (#100). */
    public function proprietario(ProprietarioRequest $request): ProprietarioResource
    {
        $periodo = $request->periodo();

        return new ProprietarioResource(($this->resumoDoProprietario)($periodo), $periodo);
    }

    /** `GET /api/postos/{posto}/movimento` — linhas cruas do período para os widgets do mês (#100). */
    public function movimento(DashboardRequest $request): MovimentoResource
    {
        $periodo = $request->periodo();

        return new MovimentoResource(($this->movimentoDoPosto)($periodo), $periodo);
    }
}
