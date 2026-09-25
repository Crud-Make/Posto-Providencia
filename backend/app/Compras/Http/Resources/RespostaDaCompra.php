<?php

declare(strict_types=1);

namespace App\Compras\Http\Resources;

use App\Compras\Application\RegistroGravado;
use App\Compras\Domain\RecusaDaCompra;
use Illuminate\Http\JsonResponse;

/**
 * Traduz o "Salvar" do Registro de Compras para HTTP:
 *
 * - gravado → 201 `{ data: { repetido: false, compras: [...], medicoes: [...] } }`;
 * - repetição da mesma chave → 200, `repetido: true`, sem somar nada de novo;
 * - recusa → `{ erro: { codigo, mensagem } }`, 409 para `chave_reutilizada` e 422 para as demais.
 */
final class RespostaDaCompra
{
    public static function de(RegistroGravado|RecusaDaCompra $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDaCompra) {
            return response()->json(
                ['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]],
                $resultado->ehConflito() ? 409 : 422,
            );
        }

        return response()->json(['data' => [
            'repetido' => $resultado->repetido,
            'compras' => CompraResource::collection($resultado->compras)->resolve(),
            'medicoes' => $resultado->medicoes,
        ]], $resultado->repetido ? 200 : 201);
    }
}
