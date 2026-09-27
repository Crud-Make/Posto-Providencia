<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\Produto;

/** O "Novo Produto" gravado — ou o mesmo cadastro chegando de novo pela chave (`repetido`). */
final readonly class ProdutoGravado
{
    public function __construct(
        public Produto $produto,
        public bool $repetido,
    ) {}
}
