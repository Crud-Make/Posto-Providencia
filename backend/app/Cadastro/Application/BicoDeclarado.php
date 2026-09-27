<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

/**
 * O que o formulário de bico do painel manda (#153): número, a bomba onde está, o combustível que
 * sai dele, o tanque de onde puxa e o status. Os ids são só a forma — se pertencem ao posto da rota
 * quem decide é {@see BicosDoPosto}. O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class BicoDeclarado
{
    public function __construct(
        public int $numero,
        public int $bombaId,
        public int $combustivelId,
        public int $tanqueId,
        public bool $ativo,
    ) {}
}
