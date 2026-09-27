<?php

declare(strict_types=1);

namespace App\Estoque\Application;

/**
 * O formulário "Novo/Editar Produto" do painel (#103, painel-pela-api.md §12) — os campos que o
 * `useGestaoEstoque` mandava ao Supabase, e só eles. `posto_id` não está aqui: é o da rota.
 *
 * Preços em string decimal com as casas que o cliente mandou: o `numeric(10,2)` arredonda ao gravar,
 * como o Postgres fazia com o número do supabase-js.
 */
final readonly class ProdutoDeclarado
{
    /**
     * @param  numeric-string  $precoCusto
     * @param  numeric-string  $precoVenda
     */
    public function __construct(
        public string $nome,
        public ?string $codigoBarras,
        public string $categoria,
        public string $precoCusto,
        public string $precoVenda,
        public int $estoqueMinimo,
        public string $unidadeMedida,
        public ?string $descricao,
    ) {}

    /** @return array<string, string|int|null> as colunas de `Produto` */
    public function colunas(): array
    {
        return [
            'nome' => $this->nome,
            'codigo_barras' => $this->codigoBarras,
            'categoria' => $this->categoria,
            'preco_custo' => $this->precoCusto,
            'preco_venda' => $this->precoVenda,
            'estoque_minimo' => $this->estoqueMinimo,
            'unidade_medida' => $this->unidadeMedida,
            'descricao' => $this->descricao,
        ];
    }
}
