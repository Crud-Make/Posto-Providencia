<?php

declare(strict_types=1);

namespace App\Financeiro\Application;

use App\Compartilhado\PostoAtual;
use App\Financeiro\Domain\Despesa;
use App\Financeiro\Domain\RecusaDaDespesa;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Lança despesas do posto em foco ({@see PostoAtual}) pela aba Receitas e Despesas (#103).
 *
 * Porte fiel de `despesaService.create` e `despesaFixaService.lancar`: grava descrição, categoria,
 * valor, data, status, recorrente, pagamento e observações COMO VIERAM. Nenhuma conta aqui — a
 * `data` decide o mês em que a despesa entra no rateio do lucro, e a regra de qual data usar
 * ("último dia do mês filtrado, ou hoje") continua na tela.
 *
 * O que muda:
 * - o posto é o da rota;
 * - a categoria escolhida tem de ser do posto ou global (`posto_id` NULL);
 * - idempotência pela chave: a mesma chave de novo devolve as linhas já gravadas (200) — a tabela
 *   não tinha unique, e o duplo clique lançava em dobro. Chave já usada por OUTRO posto é 409.
 */
final readonly class LancaDespesas
{
    public function __construct(private PostoAtual $posto) {}

    public function executar(LancamentoDeDespesas $lancamento): DespesasLancadas|RecusaDaDespesa
    {
        $repeticao = $this->repeticao($lancamento->chave);
        if ($repeticao !== null) {
            return $repeticao;
        }

        $recusa = $this->recusaDaCategoria($lancamento);
        if ($recusa !== null) {
            return $recusa;
        }

        try {
            return new DespesasLancadas(false, DB::transaction(fn (): Collection => $this->grava($lancamento)));
        } catch (UniqueConstraintViolationException) {
            return $this->repeticao($lancamento->chave) ?? new RecusaDaDespesa('chave_reutilizada', 'Este lançamento já foi usado.');
        }
    }

    /** A chave já lançou: neste posto é repetição (200); em outro, conflito (409). */
    private function repeticao(string $chave): DespesasLancadas|RecusaDaDespesa|null
    {
        $gravadas = Despesa::query()->withoutGlobalScopes()->where('chave_lancamento', $chave)->orderBy('ordem_no_lancamento')->get();
        if ($gravadas->isEmpty()) {
            return null;
        }

        return $gravadas->every(fn (Despesa $d): bool => $d->posto_id === $this->posto->id())
            ? new DespesasLancadas(true, $gravadas)
            : new RecusaDaDespesa('chave_reutilizada', 'Esta chave de lançamento já foi usada em outro posto.');
    }

    private function recusaDaCategoria(LancamentoDeDespesas $lancamento): ?RecusaDaDespesa
    {
        $pedidas = array_values(array_unique(array_filter(array_map(
            static fn (DespesaDeclarada $d): ?int => $d->categoriaId,
            $lancamento->despesas,
        ), static fn (?int $id): bool => $id !== null)));
        if ($pedidas === []) {
            return null;
        }

        $validas = DB::table('CategoriaFinanceira')
            ->whereIn('id', $pedidas)
            ->where(fn ($q) => $q->whereNull('posto_id')->orWhere('posto_id', $this->posto->id()))
            ->count();

        return $validas === count($pedidas)
            ? null
            : new RecusaDaDespesa('categoria_invalida', 'A categoria escolhida não existe neste posto.');
    }

    /** @return Collection<int, Despesa> */
    private function grava(LancamentoDeDespesas $lancamento): Collection
    {
        $gravadas = new Collection;
        foreach ($lancamento->despesas as $ordem => $d) {
            $gravadas->push(Despesa::query()->create([
                'descricao' => $d->descricao,
                'categoria' => $d->categoria,
                'categoria_id' => $d->categoriaId,
                'valor' => $d->valor,
                'data' => $d->data,
                'status' => $d->status,
                'recorrente' => $d->recorrente,
                'data_pagamento' => $d->dataPagamento,
                'observacoes' => $d->observacoes,
                'chave_lancamento' => $lancamento->chave,
                'ordem_no_lancamento' => $ordem,
            ])->refresh());
        }

        return $gravadas;
    }
}
