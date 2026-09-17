<?php

declare(strict_types=1);

namespace App\Compartilhado\Enums;

/**
 * Papel do usuário DENTRO de um posto: `"UsuarioPosto".role` (varchar, default 'operador').
 * Valores em minúsculas porque é assim que estão no banco desde 29/12/2025.
 */
enum PapelNoPosto: string
{
    case Admin = 'admin';
    case Gerente = 'gerente';
    case Operador = 'operador';

    public function gerencia(): bool
    {
        return $this === self::Admin || $this === self::Gerente;
    }
}
