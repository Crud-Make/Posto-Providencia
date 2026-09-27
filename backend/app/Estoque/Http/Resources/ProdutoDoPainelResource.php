<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Domain\Produto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um produto na tela Produtos e Estoque do painel (painel-pela-api.md §12): as colunas do
 * `select('*')` de antes que o tipo `Produto` da tela usa. Preços em string decimal; `preco_custo`
 * SAI — é dado de proprietário, e a rota é `posto.acesso:gerir`.
 *
 * @mixin Produto
 */
final class ProdutoDoPainelResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'codigo_barras' => $this->codigo_barras,
            'categoria' => $this->categoria,
            'descricao' => $this->descricao,
            'preco_custo' => $this->preco_custo,
            'preco_venda' => $this->preco_venda,
            'estoque_atual' => $this->estoque_atual,
            'estoque_minimo' => $this->estoque_minimo,
            'unidade_medida' => $this->unidade_medida,
            'ativo' => $this->ativo,
            'posto_id' => $this->posto_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
