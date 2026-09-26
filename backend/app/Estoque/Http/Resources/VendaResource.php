<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Domain\VendaProduto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma venda de produto (#101): quantidade e dinheiro em string decimal; `data` é instante ISO em UTC.
 * O produto (nome, categoria) vem quando foi carregado — na lista "vendas de hoje".
 *
 * @mixin VendaProduto
 */
final class VendaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'produto_id' => $this->produto_id,
            'quantidade' => $this->quantidade,
            'valor_unitario' => $this->valor_unitario,
            'valor_total' => $this->valor_total,
            'data' => $this->data->utc()->toIso8601ZuluString(),
            'produto' => $this->whenLoaded('produto', fn (): ?array => $this->produto === null ? null : [
                'nome' => $this->produto->nome,
                'categoria' => $this->produto->categoria,
            ]),
        ];
    }
}
