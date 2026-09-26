<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use stdClass;

/**
 * O que a tela de Tanques do painel lê do cadastro e da régua (painel-pela-api.md §11) — o porte de
 * `tanqueService.getAll`, da consulta de réguas do `useDashboardEstoque` e de `tanqueService.getHistory`.
 *
 * `Tanque` e `Combustivel` são de Cadastro: aqui se leem por query builder, só as colunas que a tela
 * usa (CA-7). `HistoricoTanque` não tem `posto_id`: o filtro de posto passa pelo tanque. Só tanque
 * ATIVO (`ativo = true`, como o `.eq('ativo', true)` de hoje — `null` fica de fora), e as réguas e o
 * histórico só dos tanques ativos, como o `.in('tanque_id', tanqueIds)` de hoje.
 */
final readonly class TanquesDoPainel
{
    public function __construct(private PostoAtual $postoAtual) {}

    /**
     * Tanques ativos do posto, por nome (e `id` para desempate), com o combustível.
     *
     * @return list<array{id: int, nome: string, combustivel_id: int, capacidade: string, combustivel: array{nome: string, codigo: string, preco_venda: string, preco_custo: ?string}}>
     */
    public function tanques(): array
    {
        return array_values(DB::table('Tanque as t')
            ->join('Combustivel as c', 'c.id', '=', 't.combustivel_id')
            ->where('t.posto_id', $this->postoId())
            ->where('t.ativo', true)
            ->orderBy('t.nome')
            ->orderBy('t.id')
            ->get(['t.id', 't.nome', 't.combustivel_id', 't.capacidade', 'c.nome as combustivel_nome', 'c.codigo', 'c.preco_venda', 'c.preco_custo'])
            ->map(static fn (stdClass $linha): array => [
                'id' => LinhaDoTanque::inteiro($linha, 'id'),
                'nome' => LinhaDoTanque::texto($linha, 'nome'),
                'combustivel_id' => LinhaDoTanque::inteiro($linha, 'combustivel_id'),
                'capacidade' => LinhaDoTanque::decimal($linha, 'capacidade'),
                'combustivel' => [
                    'nome' => LinhaDoTanque::texto($linha, 'combustivel_nome'),
                    'codigo' => LinhaDoTanque::texto($linha, 'codigo'),
                    'preco_venda' => LinhaDoTanque::decimal($linha, 'preco_venda'),
                    'preco_custo' => LinhaDoTanque::decimalOuNulo($linha, 'preco_custo'),
                ],
            ])
            ->all());
    }

    /**
     * Todas as réguas MEDIDAS (`volume_fisico` não nulo) dos tanques ativos, sem limite de data: a
     * corrente parte da última de cada tanque, e ela pode ser de qualquer dia.
     *
     * @return list<array{tanque_id: int, data: string, volume_fisico: string}>
     */
    public function reguas(): array
    {
        return array_values($this->historicoDosAtivos()
            ->whereNotNull('h.volume_fisico')
            ->get(['h.tanque_id', DB::raw('h.data::text as dia'), 'h.volume_fisico'])
            ->map(static fn (stdClass $linha): array => [
                'tanque_id' => LinhaDoTanque::inteiro($linha, 'tanque_id'),
                'data' => LinhaDoTanque::texto($linha, 'dia'),
                'volume_fisico' => LinhaDoTanque::decimal($linha, 'volume_fisico'),
            ])
            ->all());
    }

    /**
     * O gráfico "Evolução do Estoque": as linhas de `HistoricoTanque` dos tanques ativos com
     * `data >= desde`, em ordem de data. Não medido fica `null`, nunca `"0"`.
     *
     * @return list<array{id: int, tanque_id: int, data: string, volume_livro: ?string, volume_fisico: ?string}>
     */
    public function historico(string $desde): array
    {
        return array_values($this->historicoDosAtivos()
            ->where('h.data', '>=', $desde)
            ->get(['h.id', 'h.tanque_id', DB::raw('h.data::text as dia'), 'h.volume_livro', 'h.volume_fisico'])
            ->map(static fn (stdClass $linha): array => [
                'id' => LinhaDoTanque::inteiro($linha, 'id'),
                'tanque_id' => LinhaDoTanque::inteiro($linha, 'tanque_id'),
                'data' => LinhaDoTanque::texto($linha, 'dia'),
                'volume_livro' => LinhaDoTanque::decimalOuNulo($linha, 'volume_livro'),
                'volume_fisico' => LinhaDoTanque::decimalOuNulo($linha, 'volume_fisico'),
            ])
            ->all());
    }

    private function historicoDosAtivos(): Builder
    {
        return DB::table('HistoricoTanque as h')
            ->join('Tanque as t', 't.id', '=', 'h.tanque_id')
            ->where('t.posto_id', $this->postoId())
            ->where('t.ativo', true)
            ->orderBy('h.data')
            ->orderBy('h.id');
    }

    private function postoId(): int
    {
        return $this->postoAtual->id() ?? throw new RuntimeException('TanquesDoPainel exige PostoAtual definido.');
    }
}
