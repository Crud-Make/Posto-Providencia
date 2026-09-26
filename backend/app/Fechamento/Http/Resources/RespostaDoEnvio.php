<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Application\EnvioRegistrado;
use App\Fechamento\Domain\RecusaDaGravacao;
use Illuminate\Http\JsonResponse;

/**
 * Traduz o resultado de `RegistraEnvioDoFrentista` para HTTP (#101):
 *
 * - envio novo → 201 `{ data: { id, fechamento_id, frentista_id, data_hora_envio, repetido: false,
 *   consolidacao: { apurado, total_vendas, total_recebido, diferenca } } }`;
 * - repetição (mesma chave, mesmo conteúdo) → 200, o mesmo shape com `repetido: true` e
 *   `consolidacao: null`;
 * - `ja_enviado` e `chave_reutilizada` → 409; as demais recusas (`fora_da_janela`) → 422. Todas no
 *   envelope `{ erro: { codigo, mensagem } }` do PUT do painel.
 */
final class RespostaDoEnvio
{
    /** Recusas que são conflito com o que já está gravado, e não entrada inválida. */
    private const array CONFLITOS = ['ja_enviado', 'chave_reutilizada'];

    public static function de(EnvioRegistrado|RecusaDaGravacao $resultado): JsonResponse
    {
        if ($resultado instanceof RecusaDaGravacao) {
            return response()->json(
                ['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]],
                in_array($resultado->codigo, self::CONFLITOS, true) ? 409 : 422,
            );
        }

        $linha = $resultado->linha;
        $consolidacao = $resultado->consolidacao;

        return response()->json(['data' => [
            'id' => $linha->id,
            'fechamento_id' => $linha->fechamento_id,
            'frentista_id' => $linha->frentista_id,
            'data_hora_envio' => $linha->data_hora_envio?->utc()->toIso8601ZuluString(),
            'repetido' => $resultado->repetido,
            'consolidacao' => $consolidacao === null ? null : [
                'apurado' => $consolidacao->apurado,
                'total_vendas' => $consolidacao->totalVendas,
                'total_recebido' => $consolidacao->totalRecebido,
                'diferenca' => $consolidacao->diferenca,
            ],
        ]], $resultado->repetido ? 200 : 201);
    }
}
