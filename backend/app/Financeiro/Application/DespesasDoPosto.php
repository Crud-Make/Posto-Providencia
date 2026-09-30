<?php

declare(strict_types=1);

namespace App\Financeiro\Application;

use App\Compartilhado\PostoAtual;
use App\Financeiro\Domain\Despesa;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Leituras de Despesa, Receita e CategoriaFinanceira do posto em foco ({@see PostoAtual}) para a aba
 * Receitas e Despesas (#103): as despesas do período (competência pela `data`, como o rateio), as
 * recorrentes de qualquer data (a base das Despesas Fixas pendentes, que a tela calcula com
 * `fixasPendentes` do `@posto/utils`) e as categorias do posto mais as globais.
 */
final readonly class DespesasDoPosto
{
    public function __construct(private PostoAtual $posto) {}

    /** @return Collection<int, Despesa> */
    public function doPeriodo(string $inicio, string $fim): Collection
    {
        return Despesa::query()->whereBetween('data', [$inicio, $fim])->orderBy('data')->orderBy('id')->get();
    }

    /** @return Collection<int, Despesa> */
    public function recorrentes(): Collection
    {
        return Despesa::query()->where('recorrente', true)->orderBy('data')->orderBy('id')->get();
    }

    /**
     * As receitas extras do período (competência pela `data`), com o nome da categoria — o que
     * `receitaService.getByDateRange` trazia para o card da aba. Só leitura: nenhuma tela grava
     * Receita hoje. `Receita` não é model deste módulo: query builder.
     *
     * @return list<array{id: int, descricao: string, categoria: string|null, valor: string, data: string}>
     */
    public function receitasDoPeriodo(string $inicio, string $fim): array
    {
        return array_values(DB::table('Receita as r')
            ->leftJoin('CategoriaFinanceira as c', 'c.id', '=', 'r.categoria_id')
            ->where('r.posto_id', $this->posto->id())
            ->whereBetween('r.data', [$inicio, $fim])
            ->orderBy('r.data')
            ->orderBy('r.id')
            ->get(['r.id', 'r.descricao', 'c.nome as categoria', 'r.valor', 'r.data'])
            ->map(static fn (object $r): array => [
                'id' => (int) ($r->id ?? 0),
                'descricao' => (string) ($r->descricao ?? ''),
                'categoria' => isset($r->categoria) ? (string) $r->categoria : null,
                'valor' => (string) ($r->valor ?? '0'),
                'data' => substr((string) ($r->data ?? ''), 0, 10),
            ])
            ->all());
    }

    /**
     * As categorias do posto e as globais (`posto_id` NULL), do tipo pedido ou "ambos", por nome —
     * o mesmo filtro de `categoriaService.getAll`.
     *
     * @return list<array{id: int, nome: string, tipo: string, cor: string|null}>
     */
    public function categorias(?string $tipo): array
    {
        return array_values(DB::table('CategoriaFinanceira')
            ->where(fn ($q) => $q->whereNull('posto_id')->orWhere('posto_id', $this->posto->id()))
            ->when($tipo !== null, fn ($q) => $q->whereIn('tipo', [$tipo, 'ambos']))
            ->orderBy('nome')
            ->get(['id', 'nome', 'tipo', 'cor'])
            ->map(static fn (object $c): array => [
                'id' => (int) ($c->id ?? 0),
                'nome' => (string) ($c->nome ?? ''),
                'tipo' => (string) ($c->tipo ?? ''),
                'cor' => isset($c->cor) ? (string) $c->cor : null,
            ])
            ->all());
    }
}
