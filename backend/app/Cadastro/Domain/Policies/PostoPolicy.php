<?php

declare(strict_types=1);

namespace App\Cadastro\Domain\Policies;

use App\Cadastro\Domain\Posto;
use App\Compartilhado\Enums\Role;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;

/**
 * Quem pode ver e quem pode gerir um posto.
 *
 * Reproduz a intenção de `user_has_posto_access()` do banco (ADMIN global vê tudo; senão precisa
 * de vínculo ativo em "UsuarioPosto"), que existia no esquema mas nenhuma policy viva usava.
 * Registrada no Gate desde a #97; aplicada às rotas na #102, quando existir usuário autenticado.
 */
final class PostoPolicy
{
    public function ver(Usuario $usuario, Posto $posto): bool
    {
        if ($usuario->role === Role::Admin) {
            return true;
        }

        return $this->vinculoAtivo($usuario, $posto) !== null;
    }

    public function gerir(Usuario $usuario, Posto $posto): bool
    {
        if ($usuario->role === Role::Admin) {
            return true;
        }

        $vinculo = $this->vinculoAtivo($usuario, $posto);

        return $vinculo?->role?->gerencia() ?? false;
    }

    private function vinculoAtivo(Usuario $usuario, Posto $posto): ?UsuarioPosto
    {
        if (! $usuario->ativo) {
            return null;
        }

        return $usuario->vinculos()
            ->where('posto_id', $posto->id)
            ->where('ativo', true)
            ->first();
    }
}
