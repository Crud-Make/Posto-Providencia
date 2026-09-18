<?php

declare(strict_types=1);

namespace App\Compartilhado\Enums;

/**
 * Espelha o enum `"StatusFechamento"` do Postgres (coluna `"Fechamento".status`).
 * Fica em Compartilhado porque Fechamento e Notificacao leem; o módulo Fechamento nasce na #101.
 */
enum StatusFechamento: string
{
    case Rascunho = 'RASCUNHO';
    case Aberto = 'ABERTO';
    case Fechado = 'FECHADO';
}
