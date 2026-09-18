<?php

declare(strict_types=1);

namespace App\Compartilhado\Enums;

/**
 * Espelha o enum `"Role"` do Postgres (coluna `"Usuario".role`). Papel GLOBAL do usuário;
 * o papel dentro de cada posto é {@see PapelNoPosto}, em `"UsuarioPosto".role`.
 */
enum Role: string
{
    case Admin = 'ADMIN';
    case Gerente = 'GERENTE';
    case Operador = 'OPERADOR';
    case Frentista = 'FRENTISTA';
}
