<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Controllers;

use App\Pessoas\Application\EntrarComoFrentista;
use App\Pessoas\Http\Requests\EntrarComoFrentistaRequest;
use Illuminate\Http\JsonResponse;

/**
 * Login do frentista no PWA por PIN (#101, docs/design/fechamento-frentista-api.md §4 e §6).
 *
 * Resposta única para qualquer falha (401), como o login do painel: quem está do lado de fora não
 * descobre se o frentista existe, é de outro posto, está inativo ou só errou o PIN.
 */
final readonly class AcessoDoFrentistaController
{
    public function entrar(EntrarComoFrentistaRequest $request, EntrarComoFrentista $entrar): JsonResponse
    {
        $entrou = $entrar($request->postoId(), $request->frentistaId(), $request->pin());

        if ($entrou === null) {
            return response()->json(['message' => 'Frentista ou PIN incorretos.'], 401);
        }

        return response()->json([
            'token' => $entrou['token'],
            'vence_em' => $entrou['vence_em']->utc()->toIso8601ZuluString(),
            'frentista' => $entrou['frentista'],
        ]);
    }
}
