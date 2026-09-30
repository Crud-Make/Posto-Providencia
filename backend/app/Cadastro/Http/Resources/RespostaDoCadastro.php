<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Cadastro\Domain\Tanque;
use Illuminate\Http\JsonResponse;

/**
 * Traduz as escritas de cadastro do painel para HTTP (#153, #157, #103): bomba, bico, combustível, tanque ou forma de pagamento gravado → `{ data }` com
 * o status pedido (201 ao criar, 200 ao editar); recusa → 422 `{ erro: { codigo, mensagem } }`.
 */
final class RespostaDoCadastro
{
    public static function de(Bomba|Bico|Combustivel|Tanque|FormaPagamento|RecusaDoCadastro $resultado, int $status): JsonResponse
    {
        if ($resultado instanceof RecusaDoCadastro) {
            return self::recusa($resultado);
        }

        $recurso = match (true) {
            $resultado instanceof Bomba => new BombaResource($resultado),
            $resultado instanceof Bico => new BicoResource($resultado),
            $resultado instanceof Combustivel => new CombustivelResource($resultado),
            $resultado instanceof FormaPagamento => new FormaPagamentoResource($resultado),
            default => new TanqueResource($resultado),
        };

        return $recurso->response()->setStatusCode($status);
    }

    /** Recusa de regra do cadastro → 422 `{ erro: { codigo, mensagem } }` (também usada por {@see RespostaDoFornecedor}). */
    public static function recusa(RecusaDoCadastro $recusa): JsonResponse
    {
        return response()->json(['erro' => ['codigo' => $recusa->codigo, 'mensagem' => $recusa->mensagem]], 422);
    }
}
