<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\RecusaDoCadastro;
use Illuminate\Http\JsonResponse;

/**
 * Traduz a escrita de fornecedor do painel para HTTP (#103): gravado → `{ data }` com o status pedido
 * (201 ao criar, 200 ao editar); recusa → 422, no mesmo envelope do resto do cadastro. Classe própria
 * para a {@see RespostaDoCadastro} não passar do teto de acoplamento do PHPMD.
 */
final class RespostaDoFornecedor
{
    public static function de(Fornecedor|RecusaDoCadastro $resultado, int $status): JsonResponse
    {
        return $resultado instanceof RecusaDoCadastro
            ? RespostaDoCadastro::recusa($resultado)
            : (new FornecedorResource($resultado))->response()->setStatusCode($status);
    }
}
