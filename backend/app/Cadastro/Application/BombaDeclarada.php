<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

/**
 * O que o formulário de bomba do painel manda (#153). O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class BombaDeclarada
{
    public function __construct(
        public string $nome,
        public ?string $localizacao,
        public bool $ativo,
    ) {}
}
