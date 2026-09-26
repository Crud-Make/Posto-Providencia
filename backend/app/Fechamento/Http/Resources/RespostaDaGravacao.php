<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\RecusaDaGravacao;
use Illuminate\Http\JsonResponse;

/**
 * Traduz o resultado de `GravaFechamentoDoDia` para HTTP (#103 P11, Design Doc §5.2):
 *
 * - `Fechamento` → 200 `{ data: FechamentoResource }`, o MESMO shape do GET da P7, então o cliente
 *   reutiliza o schema `fechamentoDaApi`;
 * - `RecusaDaGravacao` → 422 `{ erro: { codigo, mensagem, campos? } }`, o mesmo envelope do
 *   `corpo_invalido` do FormRequest.
 *
 * Mora em `Http\Resources`, e não no controller, porque o Pest Arch proíbe o namespace de
 * controllers de tocar em qualquer classe de `Domain` (`ArquiteturaTest.php`, "não toca model") —
 * e distinguir recusa de fechamento é olhar para dois tipos de Domain. Aqui é serialização, que
 * é o que o Deptrac permite a `Http` fazer com `Domain`.
 */
final class RespostaDaGravacao
{
    public static function de(Fechamento|RecusaDaGravacao $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDaGravacao) {
            $erro = ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem];

            if ($resultado->campos !== null) {
                $erro['campos'] = $resultado->campos;
            }

            return response()->json(['erro' => $erro], 422);
        }

        return response()->json([
            'data' => new FechamentoResource($resultado->load('recebimentos')),
        ]);
    }
}
