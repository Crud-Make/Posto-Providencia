<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\PostoAtual;
use App\Estoque\Domain\Produto;
use App\Estoque\Domain\RecusaDoEstoque;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Os produtos da loja na tela Produtos e Estoque do painel (#103, painel-pela-api.md §12): listar,
 * cadastrar e editar, no posto em foco ({@see PostoAtual}).
 *
 * Porte fiel do `stockService` do Supabase:
 * - a lista são os ATIVOS do posto, por nome (`.eq('ativo', true).eq('posto_id').order('nome')`);
 * - cadastrar grava os campos do formulário e o "Estoque Inicial" direto em `estoque_atual`, sem
 *   linha de movimentação (como antes); `ativo` fica no default do banco (`true`);
 * - editar grava os mesmos campos do formulário — nunca `estoque_atual` — e carimba `updated_at`.
 *
 * O que muda, por ser multi-tenant: produto de outro posto não é alcançável pelo id (o escopo do trait
 * o esconde → `null` → 404), e o posto é o da rota, nunca do corpo. A tabela não tem trigger.
 *
 * O cadastro é idempotente pela chave (`Produto.chave_cadastro`): o mesmo "Salvar" chegando duas vezes
 * devolve o produto já criado, em vez de criá-lo de novo.
 */
final readonly class CadastroDeProdutos
{
    public function __construct(private PostoAtual $posto) {}

    /** @return Collection<int, Produto> */
    public function listar(): Collection
    {
        return Produto::query()->where('ativo', true)->orderBy('nome')->orderBy('id')->get();
    }

    public function cadastrar(string $chave, ProdutoDeclarado $declarado, int $estoqueInicial): ProdutoGravado|RecusaDoEstoque
    {
        $jaGravado = $this->pelaChave($chave, $declarado);
        if ($jaGravado !== null) {
            return $jaGravado;
        }

        try {
            return DB::transaction(function () use ($chave, $declarado, $estoqueInicial): ProdutoGravado {
                $produto = Produto::query()->create([
                    ...$declarado->colunas(),
                    'estoque_atual' => $estoqueInicial,
                    'chave_cadastro' => $chave,
                ]);

                return new ProdutoGravado($produto->refresh(), false);
            });
        } catch (UniqueConstraintViolationException $corrida) {
            return $this->pelaChave($chave, $declarado) ?? throw $corrida;
        }
    }

    public function editar(int $produtoId, ProdutoDeclarado $declarado): ?Produto
    {
        return DB::transaction(function () use ($produtoId, $declarado): ?Produto {
            $produto = Produto::query()->whereKey($produtoId)->lockForUpdate()->first();
            if ($produto === null) {
                return null;
            }

            $produto->fill($declarado->colunas());
            $produto->touch();

            return $produto->refresh();
        });
    }

    /**
     * A chave olhada em TODOS os produtos, sem o escopo de posto (o índice é do banco inteiro). Mesmo
     * posto e mesmo nome → é o mesmo cadastro chegando de novo; qualquer outra coisa → conflito (409).
     */
    private function pelaChave(string $chave, ProdutoDeclarado $declarado): ProdutoGravado|RecusaDoEstoque|null
    {
        $produto = Produto::query()->withoutGlobalScope('posto')->where('chave_cadastro', $chave)->first();

        if ($produto === null) {
            return null;
        }

        return $produto->posto_id === $this->posto->id() && $produto->nome === $declarado->nome
            ? new ProdutoGravado($produto, true)
            : new RecusaDoEstoque('chave_reutilizada', 'Esta chave de cadastro já foi usada para outro produto.');
    }
}
