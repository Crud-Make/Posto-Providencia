<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\TokenDeAcesso;
use App\Pessoas\Domain\Usuario;

/**
 * Resolve o token emitido pelo login da própria API (Sanctum) no usuário dono dele.
 *
 * Devolve `null` para token desconhecido, vencido, de dono que não é `Usuario` ou de usuário
 * desativado — desligar alguém corta o acesso na hora, sem esperar o token vencer.
 */
final readonly class VerificaTokenDaApi
{
    public function __invoke(string $token): ?Usuario
    {
        $acesso = TokenDeAcesso::findToken($token);

        if ($acesso === null || ($acesso->expires_at !== null && $acesso->expires_at->isPast())) {
            return null;
        }

        $dono = $acesso->tokenable;

        if (! $dono instanceof Usuario || ! $dono->ativo) {
            return null;
        }

        $acesso->forceFill(['last_used_at' => now()])->save();

        return $dono->withAccessToken($acesso);
    }
}
