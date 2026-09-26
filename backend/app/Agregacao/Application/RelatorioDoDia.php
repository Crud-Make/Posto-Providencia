<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;
use LogicException;
use stdClass;

/**
 * O que o Relatório Diário do painel lia do Supabase e nenhuma rota entregava (#103).
 *
 * Substitui duas consultas de `useRelatorioDiario.ts`:
 *  - `fechamentoService.getByDate` — TODAS as linhas de `Fechamento` do dia (o dia pode ter mais de
 *    uma: o unique é `(data, turno_id)` e `NULL` não colide com `NULL`), com o nome do `Usuario`
 *    que a gravou. O `GET /fechamento` devolve só a mais recente e sem o nome (CA-7).
 *  - `despesaService.getAll` filtrado por `data === dia` no cliente — aqui o filtro vai ao banco.
 *
 * Leituras e compras do mês NÃO estão aqui: já saem de `GET /leituras` e `GET /dashboard`.
 *
 * **Nenhuma conta.** Sem soma, sem status derivado, sem lucro: as linhas saem cruas, decimal em
 * string, e o painel faz o que sempre fez com elas. Query builder, sem model de outro módulo
 * (CA-7, mesma regra de {@see DadosDoPeriodo}); o `posto_id` é filtrado aqui, em toda tabela.
 */
final class RelatorioDoDia
{
    /** `Fechamento.data` é `timestamptz` gravado em 00:00 UTC: o dia é o dia em UTC. */
    private const string DIA_UTC = "(f.data AT TIME ZONE 'UTC')::date";

    public function __construct(private readonly PostoAtual $postoAtual) {}

    /**
     * @return array{
     *     fechamentos: list<array{id: int, data: string, status: string, total_vendas: string|null, diferenca: string|null, turno_id: int|null, usuario_nome: string|null}>,
     *     despesas: list<array{id: int, descricao: string, categoria: string|null, valor: string, data: string, status: string|null, data_pagamento: string|null, observacoes: string|null}>
     * }
     */
    public function __invoke(string $dia): array
    {
        $posto = $this->postoAtual->id();
        if ($posto === null) {
            throw new LogicException('RelatorioDoDia exige PostoAtual definido — a rota /api/postos/{posto} é quem define.');
        }

        return [
            'fechamentos' => $this->fechamentos($posto, $dia),
            'despesas' => $this->despesas($posto, $dia),
        ];
    }

    /**
     * Linhas de `Fechamento` do dia, em ordem de `id`. `total_vendas` e `diferenca` `null` ficam
     * `null` (I8: "ninguém apurou" não é zero). `data` sai em ISO 8601 UTC para o cliente fazer o
     * mesmo recorte por instante que faz nas leituras.
     *
     * @return list<array{id: int, data: string, status: string, total_vendas: string|null, diferenca: string|null, turno_id: int|null, usuario_nome: string|null}>
     */
    private function fechamentos(int $posto, string $dia): array
    {
        $linhas = DB::table('Fechamento as f')
            ->leftJoin('Usuario as u', 'u.id', '=', 'f.usuario_id')
            ->selectRaw(<<<'SQL'
                f.id,
                to_char(f.data AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS data,
                f.status::text AS status,
                f.total_vendas::numeric(15,2) AS total_vendas,
                f.diferenca::numeric(15,2) AS diferenca,
                f.turno_id,
                u.nome AS usuario_nome
                SQL)
            ->where('f.posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' = ?', [$dia])
            ->orderBy('f.id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'id' => LinhaDoBanco::inteiro($linha, 'id'),
            'data' => LinhaDoBanco::texto($linha, 'data'),
            'status' => LinhaDoBanco::texto($linha, 'status'),
            'total_vendas' => LinhaDoBanco::decimalOuNulo($linha, 'total_vendas'),
            'diferenca' => LinhaDoBanco::decimalOuNulo($linha, 'diferenca'),
            'turno_id' => self::inteiroOuNulo($linha, 'turno_id'),
            'usuario_nome' => LinhaDoBanco::textoOuNulo($linha, 'usuario_nome'),
        ])->all());
    }

    /**
     * `Despesa` de competência no dia (`Despesa.data` é `date`, compara direto — o mesmo
     * `d.data === dia` que o painel fazia depois de baixar todas), na ordem de `id`.
     *
     * @return list<array{id: int, descricao: string, categoria: string|null, valor: string, data: string, status: string|null, data_pagamento: string|null, observacoes: string|null}>
     */
    private function despesas(int $posto, string $dia): array
    {
        $linhas = DB::table('Despesa')
            ->selectRaw('id, descricao, categoria, valor::numeric(15,2) AS valor, data::text AS data, status, data_pagamento::text AS data_pagamento, observacoes')
            ->where('posto_id', $posto)
            ->where('data', $dia)
            ->orderBy('id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'id' => LinhaDoBanco::inteiro($linha, 'id'),
            'descricao' => LinhaDoBanco::texto($linha, 'descricao'),
            'categoria' => LinhaDoBanco::textoOuNulo($linha, 'categoria'),
            'valor' => LinhaDoBanco::decimal($linha, 'valor'),
            'data' => LinhaDoBanco::texto($linha, 'data'),
            'status' => LinhaDoBanco::textoOuNulo($linha, 'status'),
            'data_pagamento' => LinhaDoBanco::textoOuNulo($linha, 'data_pagamento'),
            'observacoes' => LinhaDoBanco::textoOuNulo($linha, 'observacoes'),
        ])->all());
    }

    private static function inteiroOuNulo(stdClass $linha, string $campo): ?int
    {
        return ($linha->{$campo} ?? null) === null ? null : LinhaDoBanco::inteiro($linha, $campo);
    }
}
