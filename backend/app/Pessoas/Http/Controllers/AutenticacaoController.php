<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Controllers;

use App\Pessoas\Application\Entrar;
use App\Pessoas\Application\PerfilDoUsuario;
use App\Pessoas\Application\Sair;
use App\Pessoas\Http\Requests\EntrarRequest;
use App\Pessoas\Http\Requests\SessaoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Login próprio da API (#102, docs/design/autenticacao.md §5). Sanctum em modo TOKEN: o login
 * devolve o token, e o cliente o manda como `Authorization: Bearer` em toda chamada.
 */
final readonly class AutenticacaoController
{
    public function __construct(private PerfilDoUsuario $perfil) {}

    public function entrar(EntrarRequest $request, Entrar $entrar): JsonResponse
    {
        $entrou = $entrar($request->email(), $request->senha(), $request->dispositivo());

        if ($entrou === null) {
            return response()->json(['message' => 'E-mail ou senha incorretos.'], 401);
        }

        return response()->json([
            'token' => $entrou['token'],
            'usuario' => ($this->perfil)($entrou['usuario']),
        ]);
    }

    public function eu(SessaoRequest $request): JsonResponse
    {
        return response()->json(['usuario' => ($this->perfil)($request->usuario())]);
    }

    public function sair(SessaoRequest $request, Sair $sair): Response
    {
        $sair($request->usuario());

        return response()->noContent();
    }
}
