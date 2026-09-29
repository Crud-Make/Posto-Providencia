<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Cadastro\Domain\Tanque;
use Illuminate\Http\JsonResponse;

/**
 * Traduz as escritas de cadastro do painel para HTTP (#153, #157): bomba, bico, combustível ou tanque gravado → `{ data }` com
 * o status pedido (201 ao criar, 200 ao editar); recusa → 422 `{ erro: { codigo, mensagem } }`.
 */
final class RespostaDoCadastro
{
    public static function de(Bomba|Bico|Combustivel|Tanque|RecusaDoCadastro $resultado, int $status): JsonResponse
    {
        if ($resultado instanceof RecusaDoCadastro) {
            return response()->json(['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]], 422);
        }

        $recurso = match (true) {
            $resultado instanceof Bomba => new BombaResource($resultado),
            $resultado instanceof Bico => new BicoResource($resultado),
            $resultado instanceof Combustivel => new CombustivelResource($resultado),
            default => new TanqueResource($resultado),
        };

        return $recurso->response()->setStatusCode($status);
    }
}
