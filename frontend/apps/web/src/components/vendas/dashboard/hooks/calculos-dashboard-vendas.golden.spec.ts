/**
 * Golden do "Lucro Estimado" do DASHBOARD DE VENDAS (sítio 3.4) sobre os 7
 * meses de `docs/data/posto_jorro_2026.sqlite`.
 *
 * [onda 3, grupo B] O card foi CONSOLIDADO na canônica: a produção agora
 * desconta a despesa operacional do mês. Este golden afirma:
 *
 *   1. a produção (`lucroEstimadoDashboard`) empata com a soma canônica de
 *      `lucroCombustivel` mês a mês;
 *   2. o ANTES/DEPOIS: a conta legada (reproduzida aqui só como documentação
 *      do modelo aposentado) mostrava exatamente UMA DESPESA MENSAL a mais —
 *      R$ 18.585,76 (jul) a R$ 35.523,58 (jan), R$ 195.230,40 nos 7 meses;
 *   3. item sem estoque cadastrado segue entrando com custo 0 (semântica
 *      preservada — mudá-la é outra decisão), com os litros no rateio.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, lucroCombustivel, somarDespesas } from '@posto/utils';
import { lucroEstimadoDashboard } from './calculos-dashboard-vendas';

const SQLITE = `${import.meta.dir}/../../../../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const MESES = [1, 2, 3, 4, 5, 6, 7] as const;

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

interface ProdutoMes {
    produto: string;
    litros: number;
    valor: number;
}

function vendasDoMes(mes: number): ProdutoMes[] {
    const porProduto = new Map<string, ProdutoMes>();
    const bicos = db
        .query('SELECT bico, litros, valor_lt, venda FROM resumo_mensal_bico WHERE ano=2026 AND mes=?')
        .all(mes) as { bico: string; litros: number; valor_lt: number | null; venda: number }[];
    for (const b of bicos) {
        const nome = PRODUTO_DO_BICO[b.bico];
        const atual = porProduto.get(nome) ?? { produto: nome, litros: 0, valor: 0 };
        atual.litros += b.litros;
        atual.valor += b.valor_lt !== null ? b.litros * b.valor_lt : b.venda;
        porProduto.set(nome, atual);
    }
    return [...porProduto.values()];
}

const custosDoMes = (mes: number): Record<string, number> => {
    const mapa: Record<string, number> = {};
    for (const c of db
        .query('SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=?')
        .all(mes) as { produto: string; media_lt: number }[]) {
        mapa[c.produto] = c.media_lt;
    }
    return mapa;
};

const despesaLancada = (mes: number): number =>
    somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=?')
            .all(mes) as { categoria: string | null; valor: number | null }[]
    );

/**
 * O que o card ANTIGO mostrava a mais que o novo, mês a mês — exatamente a
 * despesa lançada do mês, que a conta legada ignorava. Medido na onda 2
 * (28/08/2026) e mantido como régua do antes/depois da consolidação.
 */
const ANTES_MOSTRAVA_A_MAIS: Readonly<Record<number, number>> = {
    1: 35_523.58,
    2: 24_688.02,
    3: 26_794.87,
    4: 33_368.35,
    5: 30_193.82,
    6: 26_076.0,
    7: 18_585.76,
};

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: a produção É a canônica, e o antes mostrava R$ ${ANTES_MOSTRAVA_A_MAIS[mes].toFixed(2)} a mais`, () => {
        const vendas = vendasDoMes(mes);
        const custos = custosDoMes(mes);
        const despesa = despesaLancada(mes);
        const litrosTotal = vendas.reduce((s, v) => s + v.litros, 0);
        const totalVendas = vendas.reduce((s, v) => s + v.valor, 0);
        const despLt = despesaOperacionalPorLitro(despesa, litrosTotal);

        // 1. A conta REAL do card, alimentada com o custo do próprio mês.
        const doCard = lucroEstimadoDashboard(
            vendas.map((v) => ({ produto: v.produto, litros: v.litros, valor: v.valor, custoMedio: custos[v.produto] })),
            despesa
        );

        const canonico = vendas.reduce(
            (s, v) =>
                s +
                lucroCombustivel({
                    litros: v.litros,
                    precoVenda: v.valor / v.litros,
                    custoMedio: custos[v.produto],
                    despesaOperacionalLitro: despLt,
                }),
            0
        );

        expect(doCard.produtosSemCompra).toEqual([]);
        expect(doCard.profit as number).toBeCloseTo(canonico, 2);

        // 2. O modelo APOSENTADO (vendas − Σ litros × custo, sem despesa),
        // reproduzido aqui só para documentar o antes/depois em reais.
        const antes =
            totalVendas - vendas.reduce((s, v) => s + v.litros * custos[v.produto], 0);
        expect(antes - (doCard.profit as number)).toBeCloseTo(ANTES_MOSTRAVA_A_MAIS[mes], 1);
        // …e a régua é a despesa lançada de verdade, ao centavo.
        expect(ANTES_MOSTRAVA_A_MAIS[mes]).toBeCloseTo(despesa, 2);
    });
}

test('nos 7 meses o card antigo mostrava R$ 195.230,40 a mais de lucro do que o real', () => {
    const total = MESES.reduce((s, m) => s + despesaLancada(m), 0);
    expect(total).toBeCloseTo(195_230.4, 1);
});

test('produto vendido sem compra no mês derruba o card para null — nunca lucro de 100%', () => {
    // 1.000 L vendidos a R$ 6.000 sem compra no mês. Até 03/09/2026 entrava com
    // custo 0 e o card mostrava R$ 6.000 de lucro (margem 100%) em silêncio.
    const r = lucroEstimadoDashboard(
        [{ produto: 'Etanol', litros: 1000, valor: 6000, custoMedio: null }],
        0
    );
    expect(r.profit).toBeNull();
    expect(r.margin).toBeNull();
    expect(r.produtosSemCompra).toEqual(['Etanol']);
});

test('produto sem venda não derruba o card, com ou sem compra', () => {
    const r = lucroEstimadoDashboard(
        [
            { produto: 'Gasolina Comum', litros: 1000, valor: 6000, custoMedio: 5 },
            { produto: 'Diesel S10', litros: 0, valor: 0, custoMedio: null },
        ],
        0
    );
    expect(r.produtosSemCompra).toEqual([]);
    expect(r.profit).toBe(1000);
});
