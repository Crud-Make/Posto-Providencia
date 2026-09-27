<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\PostoAtual;
use App\Estoque\Domain\MovimentacaoEstoque;
use App\Estoque\Domain\PrecoMedioDoProduto;
use App\Estoque\Domain\Produto;
use App\Estoque\Domain\RecusaDoEstoque;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * A "Registrar Movimentação" da tela Produtos e Estoque (#103, painel-pela-api.md §12) — o porte de
 * `stockService.registerMovement`, que no Supabase eram três chamadas soltas (insere a movimentação,
 * lê o produto, regrava estoque e custo) e agora é UMA transação, com o produto travado:
 *
 * 1. repetição pela chave → devolve a movimentação já gravada e NÃO mexe no estoque outra vez;
 * 2. o produto tem de ser DESTE posto (escopo do trait) → senão `produto_invalido` (422);
 * 3. o efeito no produto, o mesmo de antes:
 *    - `entrada`: `estoque_atual += quantidade` e `preco_custo` = {@see PrecoMedioDoProduto};
 *    - `saida`:   `estoque_atual -= quantidade` (pode ficar negativo, como antes);
 *    - `ajuste`:  `estoque_atual += quantidade` (o "Balanço/Ajuste" da tela só soma, como antes);
 * 4. custo que não cabe no `numeric(10,2)` → `custo_fora_da_coluna` (422) e nada gravado — no
 *    Supabase o `UPDATE` falhava calado e a movimentação ficava sem efeito no produto;
 * 5. a linha de `MovimentacaoEstoque` com `data` = agora no relógio do SERVIDOR (o painel usava o do
 *    navegador). `responsavel` continua sem preencher, como antes.
 *
 * Duas requisições iguais chegando juntas: a segunda bate no unique da chave e é respondida como
 * repetição, não como 500.
 */
final readonly class RegistraMovimentacaoDeEstoque
{
    public function __construct(private PostoAtual $posto) {}

    public function __invoke(MovimentacaoDeclarada $declarada): MovimentacaoRegistrada|RecusaDoEstoque
    {
        $jaGravada = $this->pelaChave($declarada);
        if ($jaGravada !== null) {
            return $jaGravada;
        }

        try {
            return DB::transaction(fn (): MovimentacaoRegistrada|RecusaDoEstoque => $this->grava($declarada));
        } catch (UniqueConstraintViolationException $corrida) {
            return $this->pelaChave($declarada) ?? throw $corrida;
        }
    }

    private function grava(MovimentacaoDeclarada $declarada): MovimentacaoRegistrada|RecusaDoEstoque
    {
        $produto = Produto::query()->whereKey($declarada->produtoId)->lockForUpdate()->first();
        if ($produto === null) {
            return new RecusaDoEstoque('produto_invalido', 'Produto '.$declarada->produtoId.' não é deste posto.');
        }

        [$estoque, $custo] = self::efeito($produto, $declarada);
        if (! PrecoMedioDoProduto::cabeNaColuna($custo)) {
            return new RecusaDoEstoque('custo_fora_da_coluna', 'O custo médio resultante ('.$custo.') não cabe no cadastro do produto.');
        }

        $movimentacao = MovimentacaoEstoque::query()->create([
            'produto_id' => $produto->id,
            'tipo' => $declarada->tipo,
            'quantidade' => $declarada->quantidade,
            'data' => CarbonImmutable::now('UTC'),
            'observacao' => $declarada->observacao,
            'chave_movimentacao' => $declarada->chave,
        ]);

        $produto->estoque_atual = $estoque;
        $produto->preco_custo = $custo;
        $produto->touch();

        return new MovimentacaoRegistrada($movimentacao->refresh(), $produto->refresh(), false);
    }

    /**
     * O novo `[estoque_atual, preco_custo]` do produto.
     *
     * @return array{int, numeric-string}
     */
    private static function efeito(Produto $produto, MovimentacaoDeclarada $declarada): array
    {
        $custo = is_numeric($produto->preco_custo) ? $produto->preco_custo : '0';

        return match ($declarada->tipo) {
            'entrada' => [
                $produto->estoque_atual + $declarada->quantidade,
                PrecoMedioDoProduto::aposEntrada($produto->estoque_atual, $custo, $declarada->quantidade, $declarada->valorUnitario),
            ],
            'saida' => [$produto->estoque_atual - $declarada->quantidade, $custo],
            default => [$produto->estoque_atual + $declarada->quantidade, $custo],
        };
    }

    /**
     * A chave olhada em TODAS as movimentações, sem o escopo de posto (o índice é do banco inteiro).
     * Mesmo posto, produto, tipo e quantidade → é a mesma movimentação chegando de novo; qualquer
     * diferença → `chave_reutilizada` (409). A chave é de uma tentativa só.
     */
    private function pelaChave(MovimentacaoDeclarada $declarada): MovimentacaoRegistrada|RecusaDoEstoque|null
    {
        $gravada = MovimentacaoEstoque::query()->withoutGlobalScope('posto')->where('chave_movimentacao', $declarada->chave)->first();
        if ($gravada === null) {
            return null;
        }

        $produto = Produto::query()->whereKey($gravada->produto_id)->first();
        $mesma = $produto !== null
            && $gravada->posto_id === $this->posto->id()
            && $gravada->produto_id === $declarada->produtoId
            && $gravada->tipo === $declarada->tipo
            && $gravada->quantidade === $declarada->quantidade;

        return $mesma
            ? new MovimentacaoRegistrada($gravada, $produto, true)
            : new RecusaDoEstoque('chave_reutilizada', 'Esta chave de movimentação já foi usada para outra movimentação.');
    }
}
