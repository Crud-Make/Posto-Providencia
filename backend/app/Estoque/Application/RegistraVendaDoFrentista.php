<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\Produto;
use App\Estoque\Domain\RecusaDoEstoque;
use App\Estoque\Domain\VendaProduto;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Grava o carrinho de venda de produto do frentista do TOKEN (#101, fatia 2) — o que o PWA faz hoje
 * com um `insert` em `VendaProduto` por item, agora numa transação só (tudo ou nada):
 *
 * 1. repetição pela chave ({@see RepeticaoDaVenda});
 * 2. cada produto tem de ser DESTE posto (escopo do trait) e ativo → senão `produto_invalido` (422);
 * 3. a quantidade não passa do `estoque_atual` do produto → senão `sem_estoque` (422). É o limite que
 *    a tela já aplica no carrinho (`VendasScreen`), agora também no servidor. O estoque **não** é
 *    descontado — nem hoje, nem aqui (pergunta 5 do Design Doc);
 * 4. uma linha por produto, com `valor_unitario` = `preco_venda` DO BANCO e `valor_total` =
 *    preço × quantidade em bcmath (a quantidade é inteira, então o produto é exato). O PWA de hoje
 *    faz essa conta em float no cliente sobre o preço que a tela carregou (dívida §2 g do Design Doc
 *    do FSD): pela API o preço vindo do cliente nem é aceito;
 * 5. `data` = agora, no relógio do servidor (o PWA de hoje usa o do celular).
 *
 * Dois carrinhos iguais chegando juntos: o segundo bate no unique `(chave_venda, produto_id)` e é
 * respondido como repetição, não como 500.
 */
final readonly class RegistraVendaDoFrentista
{
    public function __construct(private RepeticaoDaVenda $repeticao) {}

    public function __invoke(CarrinhoDeclarado $carrinho, int $frentistaId): VendaRegistrada|RecusaDoEstoque
    {
        $jaGravada = $this->repeticao->pelaChave($carrinho, $frentistaId);
        if ($jaGravada !== null) {
            return $jaGravada;
        }

        try {
            return DB::transaction(fn (): VendaRegistrada|RecusaDoEstoque => $this->grava($carrinho, $frentistaId));
        } catch (UniqueConstraintViolationException $corrida) {
            return $this->repeticao->pelaChave($carrinho, $frentistaId) ?? throw $corrida;
        }
    }

    private function grava(CarrinhoDeclarado $carrinho, int $frentistaId): VendaRegistrada|RecusaDoEstoque
    {
        $produtos = Produto::query()
            ->where('ativo', true)
            ->whereKey(array_keys($carrinho->quantidades()))
            ->get()
            ->keyBy('id');

        $recusa = $this->confere($carrinho, $produtos);
        if ($recusa !== null) {
            return $recusa;
        }

        $agora = CarbonImmutable::now('UTC');
        $linhas = new Collection;
        foreach ($carrinho->itens as $item) {
            $preco = $produtos->get($item['produto_id'])->preco_venda ?? '0';
            $linhas->push(VendaProduto::query()->create([
                'frentista_id' => $frentistaId,
                'produto_id' => $item['produto_id'],
                'quantidade' => (string) $item['quantidade'],
                'valor_unitario' => $preco,
                'valor_total' => self::total($preco, $item['quantidade']),
                'data' => $agora,
                'chave_venda' => $carrinho->chave,
            ])->refresh());
        }

        return new VendaRegistrada($linhas, false);
    }

    /** @param  Collection<array-key, Produto>  $produtos */
    private function confere(CarrinhoDeclarado $carrinho, Collection $produtos): ?RecusaDoEstoque
    {
        foreach ($carrinho->itens as $item) {
            $produto = $produtos->get($item['produto_id']);

            if ($produto === null) {
                return new RecusaDoEstoque('produto_invalido', 'Produto '.$item['produto_id'].' não está à venda neste posto.');
            }

            if ($item['quantidade'] > $produto->estoque_atual) {
                return new RecusaDoEstoque('sem_estoque', 'Só há '.$produto->estoque_atual.' de '.$produto->nome.' no estoque.');
            }
        }

        return null;
    }

    /** Preço × quantidade, exato: `numeric(10,2)` × inteiro não tem casa a arredondar. */
    private static function total(string $preco, int $quantidade): string
    {
        return is_numeric($preco) ? bcmul($preco, (string) $quantidade, 2) : '0.00';
    }
}
