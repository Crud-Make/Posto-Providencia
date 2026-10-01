<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\RecusaDaGravacao;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

/**
 * Traduz o resultado de `GravaLeiturasDoEncerrante` (PWA do dono, #102) para HTTP:
 *
 * - as leituras do dia → 200 `{ data: LeituraResource[] }`, o MESMO shape do `GET /leituras`, então
 *   o cliente reutiliza o schema da leitura;
 * - `RecusaDaGravacao` → 422 `{ erro: { codigo, mensagem } }`, pelo {@see RespostaDaGravacao::recusa()}.
 *
 * Mora em `Http\Resources` pelo mesmo motivo de {@see RespostaDaGravacao}: distinguir recusa de
 * leitura é olhar para tipos de Domain, e o Pest Arch proíbe o controller de tocar em Domain.
 */
final class RespostaDasLeituras
{
    /** @param  Collection<int, Leitura>|RecusaDaGravacao  $resultado */
    public static function de(Collection|RecusaDaGravacao $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDaGravacao) {
            return RespostaDaGravacao::recusa($resultado);
        }

        return LeituraResource::collection($resultado)->response();
    }
}
