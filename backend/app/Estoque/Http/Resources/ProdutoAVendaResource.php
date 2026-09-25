<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Domain\Produto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um produto na tela de Vendas do PWA (#101): as colunas do `select` de hoje. `preco_venda` em string
 * decimal. `preco_custo` NÃO sai — é dado de proprietário.
 *
 * @mixin Produto
 */
final class ProdutoAVendaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'preco_venda' => $this->preco_venda,
            'estoque_atual' => $this->estoque_atual,
            'categoria' => $this->categoria,
            'unidade_medida' => $this->unidade_medida,
        ];
    }
}
