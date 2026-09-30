<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Resources;

use App\Financeiro\Application\DespesasLancadas;
use App\Financeiro\Domain\RecusaDaDespesa;
use Illuminate\Http\JsonResponse;

/**
 * Traduz o lançamento para HTTP: novo → 201 `{ data: { repetido: false, despesas } }`; repetição
 * da mesma chave → 200, `repetido: true`; recusa → `{ erro: { codigo, mensagem } }`, 409 para
 * `chave_reutilizada` e 422 para as demais.
 */
final class RespostaDaDespesa
{
    public static function doLancamento(DespesasLancadas|RecusaDaDespesa $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDaDespesa) {
            return response()->json(
                ['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]],
                $resultado->ehConflito() ? 409 : 422,
            );
        }

        return response()->json(['data' => [
            'repetido' => $resultado->repetido,
            'despesas' => DespesaResource::collection($resultado->despesas)->resolve(),
        ]], $resultado->repetido ? 200 : 201);
    }
}
