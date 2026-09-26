<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use App\Agregacao\Http\Requests\ProprietarioRequest;
use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;
use LogicException;
use stdClass;

/**
 * Insumos da Visão do Proprietário para UM posto e UM período dentro de um mês (#100).
 *
 * Substitui o que `useDashboardProprietario.ts` buscava no Supabase: a RPC
 * `get_dashboard_proprietario` (`banco/init/01-esquema-base.sql`), a `Despesa` do período, a
 * `Despesa` pendente e o último `Fechamento`. **Não calcula lucro** (Design Doc agregacao.md,
 * DECISÃO 1): devolve as somas da venda e da compra por produto, e as despesas como linhas; o
 * lucro sai de `@posto/utils` no painel.
 *
 * O que a RPC fazia, insumo por insumo, e onde está aqui:
 *  - `total_vendas` = Σ `Leitura.valor_total`             → Σ `receita` dos produtos
 *  - `volume_total` = Σ `Leitura.litros_vendidos`         → Σ `litros_vendidos`
 *  - `lucro_bruto`  = Σ litros × (preco_litro − custo)    → `receita_a_preco_litro` (Σ litros ×
 *    preco_litro, sem arredondar) e `compras` do MÊS CIVIL da leitura (o `custo_epoca` da RPC é
 *    `Σ Compra.valor_total ÷ Σ Compra.quantidade_litros` do mesmo mês e combustível). O período
 *    fica dentro de um mês ({@see ProprietarioRequest}), então o mês
 *    da leitura é um só.
 *  - O fallback da RPC para `Combustivel.preco_custo` quando o mês não tem compra **não** vem:
 *    `compras` sai `0/0` e `custoMedioCompra` devolve `null` (DECISÃO 2, aprovada pelo dono).
 *  - `lucro_liquido` e `custo_taxas` não vêm: a tela já não os usava.
 *
 * Como o query builder não passa pelo escopo global de `PertenceAoPosto`, o `posto_id` é filtrado
 * aqui, explicitamente, em toda tabela.
 */
final class ResumoDoProprietario
{
    /** `Leitura.data` e `Fechamento.data` são `timestamptz` gravados em 00:00 UTC. */
    private const string DIA_UTC = "(data AT TIME ZONE 'UTC')::date";

    public function __construct(private readonly PostoAtual $postoAtual) {}

    /**
     * @return array{
     *     produtos: list<array{combustivel_id: int, produto: string, litros_vendidos: string, receita: string, receita_a_preco_litro: string, compras: array{litros: string, valor_total: string}}>,
     *     despesas: list<string>,
     *     despesas_pendentes: list<string>,
     *     ultimo_fechamento: string|null
     * }
     */
    public function __invoke(Periodo $periodo): array
    {
        $posto = $this->postoAtual->id();
        if ($posto === null) {
            throw new LogicException('ResumoDoProprietario exige PostoAtual definido — a rota /api/postos/{posto} é quem define.');
        }

        return [
            'produtos' => $this->produtos($posto, $periodo),
            'despesas' => $this->valoresDeDespesa($posto, $periodo, pendentes: false),
            'despesas_pendentes' => $this->valoresDeDespesa($posto, $periodo, pendentes: true),
            'ultimo_fechamento' => $this->ultimoFechamento($posto),
        ];
    }

    /**
     * Só produto VENDIDO no período entra (a RPC parte das leituras). A compra é do mês civil.
     *
     * @return list<array{combustivel_id: int, produto: string, litros_vendidos: string, receita: string, receita_a_preco_litro: string, compras: array{litros: string, valor_total: string}}>
     */
    private function produtos(int $posto, Periodo $periodo): array
    {
        $mes = $periodo->mesCivil();

        $vendas = DB::table('Leitura')
            ->selectRaw('combustivel_id, SUM(litros_vendidos) AS litros, SUM(valor_total) AS receita, SUM(litros_vendidos * preco_litro) AS receita_a_preco')
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$periodo->inicio, $periodo->fim])
            ->groupBy('combustivel_id');

        $compras = DB::table('Compra')
            ->selectRaw('combustivel_id, SUM(quantidade_litros) AS litros, SUM(valor_total) AS valor_total')
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$mes->inicio, $mes->fim])
            ->groupBy('combustivel_id');

        $linhas = DB::query()
            ->fromSub($vendas, 'v')
            ->leftJoinSub($compras, 'p', 'p.combustivel_id', '=', 'v.combustivel_id')
            ->join('Combustivel as c', 'c.id', '=', 'v.combustivel_id')
            ->selectRaw(<<<'SQL'
                c.id AS combustivel_id,
                c.nome AS produto,
                v.litros::numeric(18,3) AS litros_vendidos,
                v.receita::numeric(18,2) AS receita,
                v.receita_a_preco::numeric(20,5) AS receita_a_preco_litro,
                COALESCE(p.litros, 0)::numeric(18,3) AS compras_litros,
                COALESCE(p.valor_total, 0)::numeric(18,2) AS compras_valor_total
                SQL)
            ->orderBy('c.nome')
            ->orderBy('c.id')
            ->get();

        return array_values($linhas->map(static fn (stdClass $linha): array => [
            'combustivel_id' => LinhaDoBanco::inteiro($linha, 'combustivel_id'),
            'produto' => LinhaDoBanco::texto($linha, 'produto'),
            'litros_vendidos' => LinhaDoBanco::decimal($linha, 'litros_vendidos'),
            'receita' => LinhaDoBanco::decimal($linha, 'receita'),
            'receita_a_preco_litro' => LinhaDoBanco::decimal($linha, 'receita_a_preco_litro'),
            'compras' => [
                'litros' => LinhaDoBanco::decimal($linha, 'compras_litros'),
                'valor_total' => LinhaDoBanco::decimal($linha, 'compras_valor_total'),
            ],
        ])->all());
    }

    /**
     * Valores de `Despesa`, um por linha, como o Supabase entregava — a soma e o "tem despesa?"
     * continuam no painel (`montarResumoDoMes`), sem segunda cópia aqui.
     *
     * Do período (competência, `Despesa.data`) ou, com `$pendentes`, TODAS as pendentes do posto,
     * sem filtro de data — igual à consulta antiga (`.eq('status', 'pendente')`).
     *
     * @return list<string>
     */
    private function valoresDeDespesa(int $posto, Periodo $periodo, bool $pendentes): array
    {
        $consulta = DB::table('Despesa')->selectRaw('valor::numeric(15,2) AS valor')->where('posto_id', $posto);
        $consulta = $pendentes
            ? $consulta->where('status', 'pendente')
            : $consulta->whereBetween('data', [$periodo->inicio, $periodo->fim]);

        return array_values($consulta->orderBy('data')->orderBy('id')->get()
            ->map(static fn (stdClass $linha): string => LinhaDoBanco::decimal($linha, 'valor'))
            ->all());
    }

    /** Dia (UTC) do fechamento mais recente do posto, ou `null` se nunca fechou. */
    private function ultimoFechamento(int $posto): ?string
    {
        $linha = DB::table('Fechamento')
            ->selectRaw('MAX('.self::DIA_UTC.')::text AS dia')
            ->where('posto_id', $posto)
            ->sole();

        return LinhaDoBanco::textoOuNulo($linha, 'dia');
    }
}
