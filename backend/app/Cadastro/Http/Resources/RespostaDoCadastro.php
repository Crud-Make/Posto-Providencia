<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\RecusaDoCadastro;
use Illuminate\Http\JsonResponse;

/**
 * Traduz as escritas de cadastro do painel para HTTP (#153): bomba ou bico gravado → `{ data }` com
 * o status pedido (201 ao criar, 200 ao editar); recusa → 422 `{ erro: { codigo, mensagem } }`.
 */
final class RespostaDoCadastro
{
    public static function de(Bomba|Bico|RecusaDoCadastro $resultado, int $status): JsonResponse
    {
        if ($resultado instanceof RecusaDoCadastro) {
            return response()->json(['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]], 422);
        }

        $recurso = $resultado instanceof Bomba ? new BombaResource($resultado) : new BicoResource($resultado);

        return $recurso->response()->setStatusCode($status);
    }
}
