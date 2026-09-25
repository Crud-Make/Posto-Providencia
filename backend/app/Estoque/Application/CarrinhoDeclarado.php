<?php

declare(strict_types=1);

namespace App\Estoque\Application;

/**
 * O carrinho que o frentista manda gravar (#101, fatia 2): a chave de idempotência e, por produto, a
 * quantidade. **Sem preço**: o preço é o do banco, lido na gravação (o cliente pode estar com a lista
 * velha, ou mentir). Um produto aparece uma vez só (o FormRequest recusa repetido).
 */
final readonly class CarrinhoDeclarado
{
    /** @param  non-empty-list<array{produto_id: int, quantidade: int}>  $itens */
    public function __construct(
        public string $chave,
        public array $itens,
    ) {}

    /** @return array<int, int> produto_id => quantidade */
    public function quantidades(): array
    {
        return array_column($this->itens, 'quantidade', 'produto_id');
    }
}
