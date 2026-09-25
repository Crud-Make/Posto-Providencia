<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Limites de taxa nomeados (`throttle:<nome>` nas rotas). Separado do AppServiceProvider para ele
 * não passar do teto de acoplamento do PHPMD (13).
 */
final class LimitesDeTaxaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Login do frentista por PIN (#101). O PIN tem 4 a 6 dígitos: o limite por IP sozinho deixa
        // adivinhar de vários aparelhos, então há também um por frentista. 5 por minuto = 10.000
        // PINs de 4 dígitos levam mais de um dia de tentativa contínua, e cada erro fica no log.
        RateLimiter::for('pin-frentista', static fn (Request $request): array => [
            Limit::perMinute(10)->by('pin-ip:'.$request->ip()),
            Limit::perMinute(5)->by('pin-frentista:'.$request->integer('frentista_id')),
        ]);
    }
}
