<?php

declare(strict_types=1);

namespace App\Estoque\Http\Controllers;

use App\Estoque\Application\GravaMedicaoDeTanque;
use App\Estoque\Application\PainelDeTanques;
use App\Estoque\Http\Requests\MedicaoDoPainelRequest;
use App\Estoque\Http\Requests\PainelDeTanquesRequest;
use App\Estoque\Http\Resources\RespostaDoEstoque;
use Illuminate\Http\JsonResponse;

/**
 * A tela "Tanques (Combustível)" do painel pela API (painel-pela-api.md §11). A régua do gerente é
 * a MESMA do PWA: {@see GravaMedicaoDeTanque} (upsert por tanque e dia, janela do banco, tanque do
 * posto) — uma regra só para as duas portas.
 */
final readonly class TanquesDoPainelController
{
    /** `GET /api/postos/{posto}/tanques/painel?mes=AAAA-MM&historico_desde=AAAA-MM-DD` */
    public function show(PainelDeTanquesRequest $request, PainelDeTanques $painel): JsonResponse
    {
        return response()->json($painel($request->mes(), $request->historicoDesde()));
    }

    /** `PUT /api/postos/{posto}/tanques/medicoes` — upsert por tanque e dia. */
    public function medir(MedicaoDoPainelRequest $request, GravaMedicaoDeTanque $grava): JsonResponse
    {
        return RespostaDoEstoque::daMedicao($grava($request->tanqueId(), $request->dia(), $request->volumeFisico()));
    }
}
