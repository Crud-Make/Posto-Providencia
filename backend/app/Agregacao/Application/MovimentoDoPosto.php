<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;
use LogicException;
use stdClass;

/**
 * As linhas cruas do movimento de UM posto num período — o que o Centro do Mês
 * (`widgets/resumo-mensal`) e o Impacto da Troca de Preço (`widgets/impacto-troca-preco`) liam
 * direto das tabelas do Supabase (#100, Visão do Proprietário).
 *
 * Nenhuma conta aqui (Design Doc agregacao.md, DECISÃO 1): o salto do encerrante, o custo médio,
 * o rateio, o estoque teórico e o impacto da troca moram em `@posto/utils`, com golden. O servidor
 * só filtra por posto e por dia, e devolve cada linha como o Postgres a guarda (decimal em string).
 *
 *  - `leituras`: `Leitura` do período, com o combustível DO BICO (as duas telas agrupam pelo bico:
 *    `bico:Bico!inner(combustivel_id)` no impacto, `Bico.combustivel_id` no centro do mês).
 *  - `compras`: `Compra` do período, com a data (o impacto encadeia compra por dia).
 *  - `despesas`: `Despesa` do período por competência (`data`).
 *  - `medicoes`: `HistoricoTanque` dos tanques do posto com `data ≤ fim`, SEM limite inferior — a
 *    abertura do mês é a última régua ANTES do início, e ela pode ser de qualquer dia anterior.
 *    `volume_fisico` nulo (régua não feita) sai `null`, nunca `"0"`.
 *
 * `Leitura.data` e `Compra.data` são `timestamptz` em 00:00 UTC; o dia é tomado em UTC, como em
 * {@see DadosDoPeriodo}. `Despesa.data` e `HistoricoTanque.data` são `date`.
 */
final class MovimentoDoPosto
{
    private const string DIA_UTC = "(l.data AT TIME ZONE 'UTC')::date";

    public function __construct(private readonly PostoAtual $postoAtual) {}

    /**
     * @return array{
     *     leituras: list<array{bico_id: int, combustivel_id: int, data: string, leitura_inicial: string, leitura_final: string, litros_vendidos: string, preco_litro: string, valor_total: string}>,
     *     compras: list<array{combustivel_id: int, data: string, quantidade_litros: string, valor_total: string}>,
     *     despesas: list<array{data: string, valor: string}>,
     *     medicoes: list<array{tanque_id: int, data: string, volume_fisico: string|null}>
     * }
     */
    public function __invoke(Periodo $periodo): array
    {
        $posto = $this->postoAtual->id();
        if ($posto === null) {
            throw new LogicException('MovimentoDoPosto exige PostoAtual definido — a rota /api/postos/{posto} é quem define.');
        }

        return [
            'leituras' => $this->leituras($posto, $periodo),
            'compras' => $this->compras($posto, $periodo),
            'despesas' => $this->despesas($posto, $periodo),
            'medicoes' => $this->medicoes($posto, $periodo),
        ];
    }

    /** @return list<array{bico_id: int, combustivel_id: int, data: string, leitura_inicial: string, leitura_final: string, litros_vendidos: string, preco_litro: string, valor_total: string}> */
    private function leituras(int $posto, Periodo $periodo): array
    {
        $linhas = DB::table('Leitura as l')
            ->join('Bico as b', 'b.id', '=', 'l.bico_id')
            ->selectRaw('l.bico_id, b.combustivel_id, '.self::DIA_UTC.'::text AS dia, l.leitura_inicial, l.leitura_final, l.litros_vendidos, l.preco_litro, l.valor_total')
            ->where('l.posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$periodo->inicio, $periodo->fim])
            ->orderByRaw(self::DIA_UTC)
            ->orderBy('l.bico_id')
            ->orderBy('l.id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'bico_id' => LinhaDoBanco::inteiro($linha, 'bico_id'),
            'combustivel_id' => LinhaDoBanco::inteiro($linha, 'combustivel_id'),
            'data' => LinhaDoBanco::texto($linha, 'dia'),
            'leitura_inicial' => LinhaDoBanco::decimal($linha, 'leitura_inicial'),
            'leitura_final' => LinhaDoBanco::decimal($linha, 'leitura_final'),
            'litros_vendidos' => LinhaDoBanco::decimal($linha, 'litros_vendidos'),
            'preco_litro' => LinhaDoBanco::decimal($linha, 'preco_litro'),
            'valor_total' => LinhaDoBanco::decimal($linha, 'valor_total'),
        ])->all());
    }

    /** @return list<array{combustivel_id: int, data: string, quantidade_litros: string, valor_total: string}> */
    private function compras(int $posto, Periodo $periodo): array
    {
        $linhas = DB::table('Compra as l')
            ->selectRaw('l.combustivel_id, '.self::DIA_UTC.'::text AS dia, l.quantidade_litros, l.valor_total')
            ->where('l.posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$periodo->inicio, $periodo->fim])
            ->orderByRaw(self::DIA_UTC)
            ->orderBy('l.id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'combustivel_id' => LinhaDoBanco::inteiro($linha, 'combustivel_id'),
            'data' => LinhaDoBanco::texto($linha, 'dia'),
            'quantidade_litros' => LinhaDoBanco::decimal($linha, 'quantidade_litros'),
            'valor_total' => LinhaDoBanco::decimal($linha, 'valor_total'),
        ])->all());
    }

    /** @return list<array{data: string, valor: string}> */
    private function despesas(int $posto, Periodo $periodo): array
    {
        $linhas = DB::table('Despesa')
            ->selectRaw('data::text AS dia, valor')
            ->where('posto_id', $posto)
            ->whereBetween('data', [$periodo->inicio, $periodo->fim])
            ->orderBy('data')
            ->orderBy('id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'data' => LinhaDoBanco::texto($linha, 'dia'),
            'valor' => LinhaDoBanco::decimal($linha, 'valor'),
        ])->all());
    }

    /** @return list<array{tanque_id: int, data: string, volume_fisico: string|null}> */
    private function medicoes(int $posto, Periodo $periodo): array
    {
        $linhas = DB::table('HistoricoTanque as h')
            ->join('Tanque as t', 't.id', '=', 'h.tanque_id')
            ->selectRaw('h.tanque_id, h.data::text AS dia, h.volume_fisico')
            ->where('t.posto_id', $posto)
            ->where('h.data', '<=', $periodo->fim)
            ->orderBy('h.data')
            ->orderBy('h.id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'tanque_id' => LinhaDoBanco::inteiro($linha, 'tanque_id'),
            'data' => LinhaDoBanco::texto($linha, 'dia'),
            'volume_fisico' => LinhaDoBanco::decimalOuNulo($linha, 'volume_fisico'),
        ])->all());
    }
}
