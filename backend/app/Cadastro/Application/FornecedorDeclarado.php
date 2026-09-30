<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Cnpj;

/**
 * O que o formulário de fornecedor do painel manda (#103, ensaio 30/09). O CNPJ vem como digitado —
 * quem confere e formata é o {@see Cnpj}. O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class FornecedorDeclarado
{
    public function __construct(
        public string $nome,
        public string $cnpj,
        public ?string $contato,
        public bool $ativo,
    ) {}
}
