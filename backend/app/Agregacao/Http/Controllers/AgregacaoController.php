<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Controllers;

use App\Agregacao\Application\DadosDoPeriodo;
use App\Agregacao\Application\MovimentoDoPosto;
use App\Agregacao\Application\ResumoDoProprietario;
use App\Agregacao\Application\VendaDiariaDoMes;
use App\Agregacao\Http\Requests\DashboardRequest;
use App\Agregacao\Http\Requests\FechamentoMensalRequest;
use App\Agregacao\Http\Requests\ProprietarioRequest;
use App\Agregacao\Http\Resources\DashboardResource;
use App\Agregacao\Http\Resources\FechamentoMensalResource;
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
        private readonly VendaDiariaDoMes $vendaDiariaDoMes,
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

    /** `GET /api/postos/{posto}/fechamento-mensal/{ano}/{mes}` — a venda de cada dia do mês, sem lucro. */
    public function fechamentoMensal(FechamentoMensalRequest $request): FechamentoMensalResource
    {
        $mes = $request->mes();

        return new FechamentoMensalResource(($this->vendaDiariaDoMes)($mes), $mes);
    }
}
