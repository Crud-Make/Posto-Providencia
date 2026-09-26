<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\TokenDeAcesso;
use App\Pessoas\Domain\Usuario;

/**
 * Encerra a sessão atual apagando só o token com que o usuário chegou: sair no celular não
 * derruba o painel. Com o JWT do Supabase (transição) não há token da API para apagar.
 */
final readonly class Sair
{
    public function __invoke(Usuario $usuario): void
    {
        $acesso = $usuario->currentAccessToken();

        if ($acesso instanceof TokenDeAcesso) {
            $acesso->delete();
        }
    }
}
