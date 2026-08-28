/**
 * Golden do "Lucro Estimado" do DASHBOARD DE VENDAS (sítio 3.4) contra a
 * canônica de `@posto/utils/lucro`, sobre os 7 meses de
 * `docs/data/posto_jorro_2026.sqlite`.
 *
 * A divergência deste card é a AUSÊNCIA da despesa operacional: mês a mês, o
 * lucro que ele mostra fica exatamente UMA DESPESA MENSAL acima do canônico —
 * de R$ 18.585,76 (julho) a R$ 35.523,58 (janeiro), R$ 195.230,40 nos 7
 * meses. É a maior divergência absoluta entre as 8 reimplementações do
 * saneamento. (A segunda — o custo vir do carimbo ponderado — é medida no
 * golden `calculos-analise-vendas`, e SOMA com esta.)
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, lucroCombustivel, somarDespesas } from '@posto/utils';
import { lucroEstimadoDashboard } from './calculos-dashboard-vendas';

const SQLITE = `${import.meta.dir}/../../../../../../../docs/data/posto_jorro_2026.sqlite`;
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
 * O que o card mostra A MAIS que o lucro canônico, mês a mês — exatamente a
 * despesa lançada do mês, que a conta do card ignora. Congelado em 28/08/2026.
 */
const DESPESA_QUE_O_CARD_IGNORA: Readonly<Record<number, number>> = {
    1: 35_523.58,
    2: 24_688.02,
    3: 26_794.87,
    4: 33_368.35,
    5: 30_193.82,
    6: 26_076.0,
    7: 18_585.76,
};

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: o card infla o lucro em R$ ${DESPESA_QUE_O_CARD_IGNORA[mes].toFixed(2)} (a despesa do mês)`, () => {
        const vendas = vendasDoMes(mes);
        const custos = custosDoMes(mes);
        const despesa = despesaLancada(mes);
        const litrosTotal = vendas.reduce((s, v) => s + v.litros, 0);
        const totalVendas = vendas.reduce((s, v) => s + v.valor, 0);
        const despLt = despesaOperacionalPorLitro(despesa, litrosTotal);

        // A conta REAL do card, alimentada com o custo do próprio mês para
        // isolar a divergência estrutural (sem despesa) da do carimbo.
        const doCard = lucroEstimadoDashboard(
            vendas.map((v) => ({ litros: v.litros, custoMedio: custos[v.produto] })),
            totalVendas
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

        const inflado = doCard.profit - canonico;
        expect(inflado).toBeCloseTo(DESPESA_QUE_O_CARD_IGNORA[mes], 1);
        // …e a despesa congelada é a despesa lançada de verdade, ao centavo.
        expect(DESPESA_QUE_O_CARD_IGNORA[mes]).toBeCloseTo(despesa, 2);
    });
}

test('nos 7 meses o card mostraria R$ 195.230,40 a mais de lucro do que o real', () => {
    const total = MESES.reduce((s, m) => s + despesaLancada(m), 0);
    expect(total).toBeCloseTo(195_230.4, 1);
});

test('item sem estoque cadastrado entra na receita e sai do custo (semântica do hook)', () => {
    // 1.000 L vendidos a R$ 6.000 sem estoque cadastrado: o card trata o custo
    // como zero — lucro 100% — em vez de "custo desconhecido".
    const r = lucroEstimadoDashboard([{ litros: 1000, custoMedio: null }], 6000);
    expect(r.profit).toBe(6000);
    expect(r.margin).toBe(100);
});
