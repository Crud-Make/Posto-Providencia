<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Controllers;

use App\Pessoas\Application\CriaChaveDoFrentista;
use App\Pessoas\Application\EntrarComoFrentista;
use App\Pessoas\Http\Requests\EntrarComoFrentistaRequest;
use App\Pessoas\Http\Requests\PrimeiroAcessoRequest;
use App\Pessoas\Http\Resources\RespostaDoAcesso;
use Illuminate\Http\JsonResponse;

/**
 * Login do frentista no PWA por PIN (#101, docs/design/fechamento-frentista-api.md §4 e §6) e o
 * primeiro acesso, em que o próprio frentista cria a chave (§8.7, 27/09/2026).
 *
 * No login, resposta única para qualquer falha (401), como o login do painel: quem está do lado de
 * fora não descobre se o frentista existe, é de outro posto, está inativo ou só errou o PIN.
 */
final readonly class AcessoDoFrentistaController
{
    public function entrar(EntrarComoFrentistaRequest $request, EntrarComoFrentista $entrar): JsonResponse
    {
        $entrou = $entrar($request->postoId(), $request->frentistaId(), $request->pin());

        if ($entrou === null) {
            return response()->json(['message' => 'Frentista ou PIN incorretos.'], 401);
        }

        return RespostaDoAcesso::sessao($entrou);
    }

    /** 201 com a sessão (igual ao login) · 404 não é deste posto/inativo/inexistente · 409 já tem chave. */
    public function primeiroAcesso(PrimeiroAcessoRequest $request, CriaChaveDoFrentista $criar): JsonResponse
    {
        return RespostaDoAcesso::doPrimeiroAcesso($criar($request->postoId(), $request->frentistaId(), $request->pin()));
    }
}
