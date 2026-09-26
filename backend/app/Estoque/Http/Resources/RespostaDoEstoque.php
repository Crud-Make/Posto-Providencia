<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Application\VendaRegistrada;
use App\Estoque\Domain\MedicaoDeTanque;
use App\Estoque\Domain\RecusaDoEstoque;
use Illuminate\Http\JsonResponse;

/**
 * Traduz as escritas do PWA no Estoque para HTTP (#101, fatia 2):
 *
 * - carrinho novo → 201 `{ data: { repetido: false, vendas: [...] } }`; repetição → 200, `repetido: true`;
 * - medição → 200 `{ data: { tanque_id, data, volume_fisico } }` (upsert: gravar de novo é o mesmo 200);
 * - recusa → `{ erro: { codigo, mensagem } }`, 409 para `chave_reutilizada` e 422 para as demais.
 */
final class RespostaDoEstoque
{
    public static function daVenda(VendaRegistrada|RecusaDoEstoque $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDoEstoque) {
            return self::recusa($resultado);
        }

        return response()->json(['data' => [
            'repetido' => $resultado->repetido,
            'vendas' => VendaResource::collection($resultado->linhas)->resolve(),
        ]], $resultado->repetido ? 200 : 201);
    }

    public static function daMedicao(MedicaoDeTanque|RecusaDoEstoque $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDoEstoque) {
            return self::recusa($resultado);
        }

        return response()->json(['data' => (new MedicaoResource($resultado))->resolve()]);
    }

    private static function recusa(RecusaDoEstoque $recusa): JsonResponse
    {
        return response()->json(
            ['erro' => ['codigo' => $recusa->codigo, 'mensagem' => $recusa->mensagem]],
            $recusa->ehConflito() ? 409 : 422,
        );
    }
}
