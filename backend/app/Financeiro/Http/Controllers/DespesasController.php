<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Controllers;

use App\Financeiro\Application\DespesasDoPosto;
use App\Financeiro\Application\LancaDespesas;
use App\Financeiro\Http\Requests\CategoriasRequest;
use App\Financeiro\Http\Requests\DespesasDoPeriodoRequest;
use App\Financeiro\Http\Requests\LancaDespesasRequest;
use App\Financeiro\Http\Resources\DespesaResource;
use App\Financeiro\Http\Resources\RespostaDaDespesa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Aba Receitas e Despesas do Fechamento de Caixa pela API (#103). O posto vem da rota
 * (`DefinePostoAtual`), nunca do corpo.
 */
final readonly class DespesasController
{
    public function __construct(
        private DespesasDoPosto $despesas,
        private LancaDespesas $lanca,
    ) {}

    /** `GET /api/postos/{posto}/despesas` — do período, ou só as recorrentes. */
    public function index(DespesasDoPeriodoRequest $request): AnonymousResourceCollection
    {
        return DespesaResource::collection($request->soRecorrentes()
            ? $this->despesas->recorrentes()
            : $this->despesas->doPeriodo($request->inicio(), $request->fim()));
    }

    /** `POST /api/postos/{posto}/despesas` — 201 novo, 200 repetição da mesma chave. */
    public function store(LancaDespesasRequest $request): JsonResponse
    {
        return RespostaDaDespesa::doLancamento($this->lanca->executar($request->lancamento()));
    }

    /** `GET /api/postos/{posto}/categorias-financeiras` — as do posto e as globais. */
    public function categorias(CategoriasRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->despesas->categorias($request->tipo())]);
    }
}
