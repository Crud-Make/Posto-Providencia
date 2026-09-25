<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\Usuario;

/**
 * O que o cliente recebe sobre quem está logado: identidade, papel e os postos em que pode entrar.
 * A senha nunca sai daqui.
 */
final readonly class PerfilDoUsuario
{
    public function __construct(private PostosDoUsuario $postos) {}

    /** @return array{id: int, nome: string, email: string, role: string, postos: list<array{id: int, nome: string, papel: string}>} */
    public function __invoke(Usuario $usuario): array
    {
        return [
            'id' => $usuario->id,
            'nome' => $usuario->nome,
            'email' => $usuario->email,
            'role' => $usuario->role->value,
            'postos' => ($this->postos)($usuario),
        ];
    }
}
