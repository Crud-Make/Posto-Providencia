<?php

use App\Pessoas\Http\Middleware\AutenticaPeloTokenAtual;
use App\Pessoas\Http\Middleware\ExigeAcessoAoPosto;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Guard da transição (DECISÃO A): 'token.atual' diz QUEM é; 'posto.acesso' diz se pode ver
        // ESTE posto. A ordem na rota é token.atual → DefinePostoAtual → posto.acesso, porque a
        // policy precisa do posto já resolvido.
        $middleware->alias([
            'token.atual' => AutenticaPeloTokenAtual::class,
            'posto.acesso' => ExigeAcessoAoPosto::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
