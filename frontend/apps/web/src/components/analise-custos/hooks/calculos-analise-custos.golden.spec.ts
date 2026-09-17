/**
 * Golden do simulador de markup da ANÁLISE DE CUSTOS (sítio 3.6) contra a
 * canônica, sobre julho/2026 (`docs/data/posto_jorro_2026.sqlite`).
 *
 * ACHADO desta medição (28/08/2026): ao contrário dos outros sítios, o modelo
 * `preco = custo ÷ (1 − margem%)` NÃO diverge da conta canônica — a "margem"
 * dele é margem sobre o PREÇO, que é exatamente `margemPercentual = lucro ÷
 * receita`. Alimentado com o custo total canônico e a margem canônica de
 * julho, ele devolve o preço de bomba praticado ao décimo de milésimo, e
 * `calculateProfit` devolve o lucro canônico. As divergências reais são:
 *
 *   1. interpretação: margem digitada como "sobre o custo" dá outro preço
 *      (20% sobre 5,00 → 6,25 aqui; 6,00 no markup sobre custo);
 *   2. o teto arbitrário `margem ≥ 100% → custo × 10`, invenção da tela;
 *   3. os INSUMOS em produção vêm de `fetchProfitabilityData` (aggregator),
 *      que herda o carimbo ponderado — divergência já medida nos goldens
 *      `estoque-encadeamento` e `calculos-analise-vendas`.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    despesaOperacionalPorLitro,
    lucroCombustivel,
    margemPercentual,
    somarDespesas,
} from '@posto/utils';
import { precoParaMargem } from '@posto/utils';
import { calculatePrice, calculateProfit } from './calculos-analise-custos';

const SQLITE = `${import.meta.dir}/../../../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

function julhoPorProduto() {
    const porProduto = new Map<string, { litros: number; valor: number }>();
    const bicos = db
        .query('SELECT bico, litros, valor_lt, venda FROM resumo_mensal_bico WHERE ano=2026 AND mes=7')
        .all() as { bico: string; litros: number; valor_lt: number | null; venda: number }[];
    for (const b of bicos) {
        const nome = PRODUTO_DO_BICO[b.bico];
        const atual = porProduto.get(nome) ?? { litros: 0, valor: 0 };
        atual.litros += b.litros;
        atual.valor += b.valor_lt !== null ? b.litros * b.valor_lt : b.venda;
        porProduto.set(nome, atual);
    }
    const custos = new Map(
        (
            db
                .query('SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=7')
                .all() as { produto: string; media_lt: number }[]
        ).map((c) => [c.produto, c.media_lt])
    );
    const despesa = somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=7')
            .all() as { categoria: string | null; valor: number | null }[]
    );
    const litrosTotal = [...porProduto.values()].reduce((s, v) => s + v.litros, 0);
    const despLt = despesaOperacionalPorLitro(despesa, litrosTotal);
    return [...porProduto.entries()].map(([produto, v]) => ({
        produto,
        litros: v.litros,
        receita: v.valor,
        precoPraticado: v.valor / v.litros,
        custoTotalL: custos.get(produto)! + despLt,
    }));
}

test('a margem do markup É a margem canônica: com ela, o simulador devolve o preço de bomba de julho', () => {
    for (const p of julhoPorProduto()) {
        const lucro = lucroCombustivel({
            litros: p.litros,
            precoVenda: p.precoPraticado,
            custoMedio: p.custoTotalL,
            despesaOperacionalLitro: 0,
        });
        const margemCanonica = margemPercentual(lucro, p.receita);

        // markup(custo, margem canônica) reconstrói o preço praticado…
        expect(calculatePrice(p.custoTotalL, margemCanonica)).toBeCloseTo(p.precoPraticado, 4);
        // …e o lucro projetado é o lucro canônico (a menos da quantização).
        expect(calculateProfit(p.precoPraticado, p.custoTotalL, p.litros)).toBeCloseTo(lucro, 1);
    }
});

test('a divergência é de interpretação: margem sobre o CUSTO daria outro preço', () => {
    // 20% sobre custo R$ 5,00: markup sobre preço → R$ 6,25; sobre custo → R$ 6,00.
    expect(calculatePrice(5, 20)).toBeCloseTo(6.25, 10);
    expect(5 * 1.2).toBeCloseTo(6.0, 10);
    // A diferença no preço de bomba seria de R$ 0,25/L para a mesma "margem digitada".
    expect(calculatePrice(5, 20) - 5 * 1.2).toBeCloseTo(0.25, 10);
});

test('precoParaMargem é a inversa exata de margemPercentual (roundtrip em julho)', () => {
    // [onda 3, grupo A] `calculatePrice` passou a delegar a `precoParaMargem`
    // (@posto/utils/lucro). O roundtrip fecha nos dois sentidos com o dado real.
    for (const p of julhoPorProduto()) {
        const margem = margemPercentual(p.precoPraticado - p.custoTotalL, p.precoPraticado);
        const preco = precoParaMargem(p.custoTotalL, margem);
        expect(preco).toBeCloseTo(p.precoPraticado, 9);
        expect(margemPercentual(preco - p.custoTotalL, preco)).toBeCloseTo(margem, 9);
        // e abaixo do teto o simulador da tela É a canônica, sem desvio nenhum
        expect(calculatePrice(p.custoTotalL, margem)).toBe(preco);
    }
});

test('o teto `margem ≥ 100% → custo × 10` é invenção da tela, sem contraparte canônica', () => {
    expect(calculatePrice(5, 100)).toBe(50);
    expect(calculatePrice(5, 250)).toBe(50);
    // Logo abaixo do teto a curva já explodiu: 99% → custo × 100.
    expect(calculatePrice(5, 99)).toBeCloseTo(500, 6);
});
