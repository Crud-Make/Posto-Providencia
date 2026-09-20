<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\FechamentoDoDia;
use App\Fechamento\Http\Requests\DiaRequest;
use App\Fechamento\Http\Resources\FechamentoResource;
use Illuminate\Http\JsonResponse;

/**
 * `GET /api/postos/{posto}/fechamento?data=AAAA-MM-DD` — o fechamento do dia (#103, fatia P7).
 *
 * Dia sem fechamento é **200 com `data: null`**, não 404: "ainda não fecharam este dia" é
 * resposta normal do domínio, não recurso inexistente. O painel abre em dia vazio o tempo todo.
 */
final class FechamentoController
{
    public function __construct(private readonly FechamentoDoDia $fechamentoDoDia) {}

    public function show(DiaRequest $request): JsonResponse
    {
        $fechamento = ($this->fechamentoDoDia)($request->dia());

        return response()->json([
            'data' => $fechamento === null ? null : new FechamentoResource($fechamento),
        ]);
    }
}
