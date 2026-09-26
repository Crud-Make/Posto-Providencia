<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Middleware;

use App\Pessoas\Application\VerificaTokenDaApi;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guard da transição (DECISÃO A, docs/design/fechamento-diario-api.md §6): aceita o token que o
 * painel JÁ tem — o JWT do Supabase Auth — e resolve o `Usuario` por `auth_user_id`.
 *
 * O painel não precisa trocar de login para uma fatia migrar. Quando o Sanctum entrar como
 * segundo emissor (#102), só muda quem assina o token; este middleware continua o mesmo.
 *
 * Só identidade: quem pode ver ESTE posto é a {@see ExigeAcessoAoPosto}, depois do
 * `DefinePostoAtual`.
 */
final readonly class AutenticaPeloTokenAtual
{
    public function __construct(
        private VerificaTokenDoSupabase $verifica,
        private VerificaTokenDaApi $verificaDaApi,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null || $token === '') {
            abort(401, 'Token ausente.');
        }

        $usuario = $this->usuarioDoToken($token);

        // Token válido e assinado, mas sem Usuario ativo correspondente: quem se desligou do posto
        // continua com token de sessão válido no Supabase até ele expirar. 401 e não 403 porque
        // aqui ainda não se sabe QUAL posto ele tentou acessar — isso é da policy.
        if ($usuario === null) {
            abort(401, 'Usuário sem acesso.');
        }

        // Duas portas de propósito: `user()` para quem consome (controller, policy) e o atributo
        // para o middleware seguinte. `Request::user()` é tipado como App\Models\User pelo
        // framework, então ler de lá com `instanceof Usuario` é sempre falso para o PHPStan.
        $request->setUserResolver(fn (): Usuario => $usuario);
        $request->attributes->set('usuario', $usuario);

        return $next($request);
    }

    /**
     * Dois emissores, reconhecidos pela forma: o token do login da API (Sanctum, `id|segredo`) e,
     * enquanto o painel da transição existir, o JWT do Supabase (três partes separadas por ponto,
     * nunca tem `|`). O do Supabase sai junto com o Supabase.
     */
    private function usuarioDoToken(string $token): ?Usuario
    {
        if (str_contains($token, '|')) {
            return ($this->verificaDaApi)($token) ?? abort(401, 'Token inválido.');
        }

        $authUserId = ($this->verifica)($token);

        if ($authUserId === null) {
            abort(401, 'Token inválido.');
        }

        return Usuario::query()
            ->where('auth_user_id', $authUserId)
            ->where('ativo', true)
            ->first();
    }
}
