<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use LogicException;
use stdClass;

/**
 * Agregado bruto do período, por combustível, para o dashboard do proprietário.
 *
 * Só leitura, com query builder sobre as tabelas — nenhum model de módulo (Design Doc
 * agregacao.md §2, regra CA-7 sem exceção): `Leitura` e `Compra` pertencem a módulos que ainda
 * não existem, e o contrato de dado é o esquema (`banco/init/01-esquema-base.sql`). Como o
 * query builder não passa pelo escopo global do trait `PertenceAoPosto`, o `posto_id` é
 * filtrado aqui, explicitamente, em todas as tabelas.
 *
 * **Não calcula lucro** (DECISÃO 1). Soma no Postgres em `numeric` e devolve string decimal.
 *
 * Insumo por insumo do `lucro.ts` (mesmo significado das telas de hoje):
 *  - `litrosVendidos` ← Σ `Leitura.litros_vendidos`   (aggregator.service.ts: `item.litros`)
 *  - `receita`        ← Σ `Leitura.valor_total`       (idem `item.valor`; preço = valor/litros)
 *  - `compras.*`      ← Σ `Compra.quantidade_litros`, Σ `Compra.valor_total` do MÊS CIVIL que
 *                       contém o período ({@see Periodo::mesCivil()}; aggregator.service.ts:256-264
 *                       lê a compra por `mesCivil(dataInicio)`; custo-do-mes.ts → `custoMedioCompra`)
 *  - `rateio`         ← Σ `Despesa.valor` por `Despesa.data` (competência, não `data_pagamento` —
 *                       o filtro de `despesaService.getByMonth`) e Σ `Leitura.litros_vendidos` de
 *                       TODOS os combustíveis, ambos do MESMO mês civil (aggregator.service.ts:43-61;
 *                       lucro.ts:36-41 `despesaOperacionalPorLitro` divide no cliente, não aqui)
 */
final class DadosDoPeriodo
{
    /**
     * `Leitura.data` e `Compra.data` são `timestamptz` gravados em 00:00 UTC (memória
     * timestamps-leitura-em-utc: 1.230/1.230 linhas). A sessão do Postgres do compose está em
     * America/Sao_Paulo, e comparar `timestamptz >= date` nela empurra o dia 1 para fora
     * (`'2026-01-01 00:00+00' >= '2026-01-01'::date` é FALSO). O dia da leitura é o dia em UTC.
     */
    private const string DIA_UTC = "(data AT TIME ZONE 'UTC')::date";

    public function __construct(private readonly PostoAtual $postoAtual) {}

    public function __invoke(Periodo $periodo): AgregadoDoPeriodo
    {
        $posto = $this->postoAtual->id();
        if ($posto === null) {
            throw new LogicException('DadosDoPeriodo exige PostoAtual definido — a rota /api/postos/{posto} é quem define.');
        }

        return new AgregadoDoPeriodo(
            periodo: $periodo,
            produtos: $this->produtos($posto, $periodo),
            rateio: $this->rateio($posto, $periodo->mesCivil()),
        );
    }

    /**
     * Um combustível entra se teve venda no período OU compra no mês civil dele (FULL OUTER JOIN
     * das duas somas); o nome vem de `Combustivel`. Produto com compra e sem venda sai com venda
     * zerada, e vice-versa — `custoLitrosVendidos()` ignora litros 0 e trata compra 0 como não
     * apurável. A venda POR PRODUTO fica no período exato; a compra alarga para o mês civil, assim
     * como o {@see self::rateio()} (decisões 1 e 2 do dono, 18/09/2026).
     *
     * @return list<ProdutoAgregado>
     */
    private function produtos(int $posto, Periodo $periodo): array
    {
        $vendas = $this->somaNoPeriodo('Leitura', 'SUM(litros_vendidos) AS litros, SUM(valor_total) AS receita', $posto, $periodo);
        $compras = $this->somaNoPeriodo('Compra', 'SUM(quantidade_litros) AS litros, SUM(valor_total) AS valor_total', $posto, $periodo->mesCivil());

        $linhas = DB::query()
            ->fromSub($vendas, 'v')
            ->joinSub($compras, 'p', 'p.combustivel_id', '=', 'v.combustivel_id', 'full outer')
            ->join('Combustivel as c', 'c.id', '=', DB::raw('COALESCE(v.combustivel_id, p.combustivel_id)'))
            ->selectRaw(<<<'SQL'
                c.id AS combustivel_id,
                c.nome AS produto,
                COALESCE(v.litros, 0)::numeric(18,3) AS litros_vendidos,
                COALESCE(v.receita, 0)::numeric(18,2) AS receita,
                COALESCE(p.litros, 0)::numeric(18,3) AS compras_litros,
                COALESCE(p.valor_total, 0)::numeric(18,2) AS compras_valor_total
                SQL)
            ->orderBy('c.nome')
            ->orderBy('c.id')
            ->get();

        return array_values($linhas
            ->map(static fn (stdClass $linha): ProdutoAgregado => new ProdutoAgregado(
                combustivelId: self::inteiro($linha, 'combustivel_id'),
                produto: self::texto($linha, 'produto'),
                litrosVendidos: self::decimal($linha, 'litros_vendidos'),
                receita: self::decimal($linha, 'receita'),
                comprasLitros: self::decimal($linha, 'compras_litros'),
                comprasValorTotal: self::decimal($linha, 'compras_valor_total'),
            ))
            ->all());
    }

    /**
     * Σ de `$colunas` por `combustivel_id`, só do posto e só dos dias (em UTC) do período.
     *
     * @param  literal-string  $tabela
     * @param  literal-string  $colunas  SQL escrito aqui na classe, nunca vindo de entrada
     */
    private function somaNoPeriodo(string $tabela, string $colunas, int $posto, Periodo $periodo): Builder
    {
        return DB::table($tabela)
            ->selectRaw('combustivel_id, '.$colunas)
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$periodo->inicio, $periodo->fim])
            ->groupBy('combustivel_id');
    }

    /**
     * Despesa e litros do MÊS CIVIL, os dois insumos de `despesaOperacionalPorLitro` (lucro.ts:36-41),
     * somados na mesma janela para que o cliente nunca divida despesa de um mês por litros de outro.
     *
     * `Despesa.data` é `date` (competência; `data_pagamento` não entra), então compara direto.
     * `Leitura.data` é `timestamptz` e passa por {@see self::DIA_UTC}. Os litros são de TODOS os
     * combustíveis, sem agrupar — igual ao aggregator.service.ts:49, que lê o mês inteiro sem filtro.
     * Nenhuma divisão aqui (DECISÃO 1).
     */
    private function rateio(int $posto, Periodo $mesCivil): RateioDoMesCivil
    {
        $despesas = DB::table('Despesa')
            ->selectRaw('COALESCE(SUM(valor), 0)::numeric(18,2) AS total')
            ->where('posto_id', $posto)
            ->whereBetween('data', [$mesCivil->inicio, $mesCivil->fim])
            ->sole();

        $litros = DB::table('Leitura')
            ->selectRaw('COALESCE(SUM(litros_vendidos), 0)::numeric(18,3) AS litros')
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$mesCivil->inicio, $mesCivil->fim])
            ->sole();

        return new RateioDoMesCivil(
            mesCivil: $mesCivil,
            despesasTotal: self::decimal($despesas, 'total'),
            litrosVendidos: self::decimal($litros, 'litros'),
        );
    }

    private static function inteiro(stdClass $linha, string $campo): int
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_int($valor)) {
            throw new LogicException("Coluna {$campo}: esperava inteiro do Postgres.");
        }

        return $valor;
    }

    private static function texto(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_string($valor)) {
            throw new LogicException("Coluna {$campo}: esperava texto do Postgres.");
        }

        return $valor;
    }

    /** O PDO pgsql entrega `numeric` como string — é o que garante escala exata e zero float. */
    private static function decimal(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_string($valor) || ! is_numeric($valor)) {
            throw new LogicException("Coluna {$campo}: esperava numeric (string decimal) do Postgres.");
        }

        return $valor;
    }
}
