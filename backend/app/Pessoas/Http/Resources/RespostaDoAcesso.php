<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Resources;

use App\Pessoas\Domain\RecusaDoPrimeiroAcesso;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/**
 * As respostas do acesso do frentista ao PWA (#101): a sessão (login por PIN e primeiro acesso têm o
 * MESMO corpo) e a recusa do primeiro acesso. Mora em Http\Resources porque controller não toca o
 * Domain (Pest Arch), como o `RespostaDoEstoque` do Estoque.
 */
final class RespostaDoAcesso
{
    /** @param  array{token: string, vence_em: CarbonImmutable, frentista: array{id: int, nome: string}}  $entrou */
    public static function sessao(array $entrou, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $entrou['token'],
            'vence_em' => $entrou['vence_em']->utc()->toIso8601ZuluString(),
            'frentista' => $entrou['frentista'],
        ], $status);
    }

    /**
     * 201 com a sessão · 409 `{ erro: { codigo, mensagem } }` (já tem chave) · 404 `{ message }`.
     *
     * @param  array{token: string, vence_em: CarbonImmutable, frentista: array{id: int, nome: string}}|RecusaDoPrimeiroAcesso  $resultado
     */
    public static function doPrimeiroAcesso(array|RecusaDoPrimeiroAcesso $resultado): JsonResponse
    {
        if (! $resultado instanceof RecusaDoPrimeiroAcesso) {
            return self::sessao($resultado, 201);
        }

        return $resultado->codigo === RecusaDoPrimeiroAcesso::JA_TEM_CHAVE
            ? response()->json(['erro' => ['codigo' => $resultado->codigo, 'mensagem' => $resultado->mensagem]], $resultado->status)
            : response()->json(['message' => $resultado->mensagem], $resultado->status);
    }
}
