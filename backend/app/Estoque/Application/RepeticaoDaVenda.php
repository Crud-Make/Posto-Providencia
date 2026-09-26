<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\RecusaDoEstoque;
use App\Estoque\Domain\VendaProduto;

/**
 * A idempotência do carrinho (#101, fatia 2), no desenho da do envio do turno:
 *
 * - nenhuma linha com esta chave → `null` (é carrinho novo);
 * - linhas com esta chave, do MESMO frentista, com os MESMOS produtos e quantidades → é o mesmo
 *   carrinho chegando de novo (a rede caiu depois de gravar): devolve as linhas, `repetido`;
 * - qualquer diferença → `chave_reutilizada` (409). A chave é de uma tentativa só.
 *
 * A chave é olhada em TODAS as vendas (o índice é do banco inteiro): a chave de um carrinho de outro
 * frentista não devolve as linhas dele.
 */
final readonly class RepeticaoDaVenda
{
    public function pelaChave(CarrinhoDeclarado $carrinho, int $frentistaId): VendaRegistrada|RecusaDoEstoque|null
    {
        $linhas = VendaProduto::query()->where('chave_venda', $carrinho->chave)->orderBy('id')->get();

        if ($linhas->isEmpty()) {
            return null;
        }

        $mesmoDono = $linhas->every(static fn (VendaProduto $linha): bool => $linha->frentista_id === $frentistaId);

        return $mesmoDono && $this->mesmosItens(array_values($linhas->all()), $carrinho)
            ? new VendaRegistrada($linhas, true)
            : new RecusaDoEstoque('chave_reutilizada', 'Esta chave de venda já foi usada para outra venda.');
    }

    /** @param  list<VendaProduto>  $linhas */
    private function mesmosItens(array $linhas, CarrinhoDeclarado $carrinho): bool
    {
        $pedido = $carrinho->quantidades();
        if (count($linhas) !== count($pedido)) {
            return false;
        }

        foreach ($linhas as $linha) {
            $quantidade = $pedido[$linha->produto_id] ?? null;
            if ($quantidade === null || ! is_numeric($linha->quantidade) || bccomp($linha->quantidade, (string) $quantidade, 2) !== 0) {
                return false;
            }
        }

        return true;
    }
}
