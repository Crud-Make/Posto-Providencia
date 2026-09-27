<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

/**
 * O que o formulário de tanque do painel manda (#157). Sem estoque (decisão do dono, 27/09): o
 * tanque nasce com 0 e o estoque de partida é a primeira régua. A capacidade vai em string decimal
 * (litros), como a coluna `numeric(10,2)`. O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class TanqueDeclarado
{
    public function __construct(
        public string $nome,
        public int $combustivelId,
        public string $capacidade,
        public bool $ativo,
    ) {}
}
