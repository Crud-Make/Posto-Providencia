<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\FechamentoDoDia;
use App\Fechamento\Application\GravaFechamentoDoDia;
use App\Fechamento\Http\Requests\DiaRequest;
use App\Fechamento\Http\Requests\GravaFechamentoDoDiaRequest;
use App\Fechamento\Http\Resources\FechamentoResource;
use App\Fechamento\Http\Resources\RespostaDaGravacao;
use Illuminate\Http\JsonResponse;

/**
 * `GET /api/postos/{posto}/fechamento?data=AAAA-MM-DD` — o fechamento do dia (#103, fatia P7).
 *
 * Dia sem fechamento é **200 com `data: null`**, não 404: "ainda não fecharam este dia" é
 * resposta normal do domínio, não recurso inexistente. O painel abre em dia vazio o tempo todo.
 *
 * `PUT /api/postos/{posto}/fechamento?data=AAAA-MM-DD` — grava o dia (#103, fatia P11). Só quem
 * GERE o posto (`posto.acesso:gerir`). O corpo é validado na forma pelo FormRequest, a regra é do
 * Command, e a recusa volta como 422 pelo {@see RespostaDaGravacao} — o controller não conhece
 * Domain (Pest Arch).
 */
final class FechamentoController
{
    public function __construct(
        private readonly FechamentoDoDia $fechamentoDoDia,
        private readonly GravaFechamentoDoDia $gravaFechamentoDoDia,
    ) {}

    public function show(DiaRequest $request): JsonResponse
    {
        $fechamento = ($this->fechamentoDoDia)($request->dia());

        return response()->json([
            'data' => $fechamento === null ? null : new FechamentoResource($fechamento),
        ]);
    }

    public function update(GravaFechamentoDoDiaRequest $request): JsonResponse
    {
        $resultado = ($this->gravaFechamentoDoDia)($request->diaDeclarado(), $request->usuarioId());

        return RespostaDaGravacao::de($resultado);
    }
}
