<?php

declare(strict_types=1);

namespace App\Estoque\Http\Controllers;

use App\Estoque\Application\GravaMedicaoDeTanque;
use App\Estoque\Application\ReguaDoPosto;
use App\Estoque\Http\Requests\GravaMedicaoRequest;
use App\Estoque\Http\Requests\MedicoesDoDiaRequest;
use App\Estoque\Http\Resources\MedicaoResource;
use App\Estoque\Http\Resources\RespostaDoEstoque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** A tela de régua do PWA pela API (#101, fatia 2). A medição é do TANQUE, não do frentista. */
final readonly class ReguaController
{
    public function __construct(private ReguaDoPosto $regua) {}

    /** `GET /api/postos/{posto}/regua/tanques` */
    public function tanques(): JsonResponse
    {
        return response()->json(['data' => $this->regua->tanques()]);
    }

    /** `GET /api/postos/{posto}/regua/medicoes?data=AAAA-MM-DD` */
    public function medicoes(MedicoesDoDiaRequest $request): AnonymousResourceCollection
    {
        return MedicaoResource::collection($this->regua->medicoes($request->dia()));
    }

    /** `PUT /api/postos/{posto}/regua/medicoes` — upsert por tanque e dia. */
    public function grava(GravaMedicaoRequest $request, GravaMedicaoDeTanque $grava): JsonResponse
    {
        return RespostaDoEstoque::daMedicao($grava($request->tanqueId(), $request->dia(), $request->volumeFisico()));
    }
}
