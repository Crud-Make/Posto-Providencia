<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\MovimentacaoEstoque;
use App\Estoque\Domain\Produto;

/**
 * A movimentação gravada e o produto como ficou depois dela — ou a mesma movimentação chegando de novo
 * pela chave (`repetido`), com o produto como está agora (nada foi somado outra vez).
 */
final readonly class MovimentacaoRegistrada
{
    public function __construct(
        public MovimentacaoEstoque $movimentacao,
        public Produto $produto,
        public bool $repetido,
    ) {}
}
