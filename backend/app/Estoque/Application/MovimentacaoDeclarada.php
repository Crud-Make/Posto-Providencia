<?php

declare(strict_types=1);

namespace App\Estoque\Application;

/**
 * A "Registrar Movimentação" do painel (#103, painel-pela-api.md §12): a chave de idempotência (uma
 * por abertura do modal), o produto, o tipo, a quantidade e — só na entrada — o custo unitário, que
 * refaz o custo médio do produto e não é gravado em lugar nenhum além dele.
 */
final readonly class MovimentacaoDeclarada
{
    public const array TIPOS = ['entrada', 'saida', 'ajuste'];

    /** @param  numeric-string|null  $valorUnitario */
    public function __construct(
        public string $chave,
        public int $produtoId,
        public string $tipo,
        public int $quantidade,
        public ?string $valorUnitario,
        public ?string $observacao,
    ) {}
}
