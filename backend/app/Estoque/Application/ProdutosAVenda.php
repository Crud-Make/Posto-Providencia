<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\Produto;
use Illuminate\Database\Eloquent\Collection;

/**
 * Os produtos que o frentista pode vender pelo PWA (#101, fatia 2) — o porte de `buscarProdutosAtivos`:
 * ativos do posto (escopo do trait), por nome. O custo NÃO sai (o resource escolhe as colunas).
 */
final readonly class ProdutosAVenda
{
    /** @return Collection<int, Produto> */
    public function __invoke(): Collection
    {
        return Produto::query()->where('ativo', true)->orderBy('nome')->get();
    }
}
