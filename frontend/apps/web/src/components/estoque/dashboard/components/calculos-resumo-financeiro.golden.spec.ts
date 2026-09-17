/**
 * Golden do "Lucro Previsto Estimado" do dashboard de estoque (sítio 3.5)
 * sobre o estoque REAL de julho/2026 (`docs/data/posto_jorro_2026.sqlite`).
 *
 * [onda 3, grupo B] O card foi CONSOLIDADO na projeção canônica:
 * `estoque × (preco_venda − preco_custo − despesa_operacional/L)`. Com a
 * régua de julho (9.628 L nos 4 produtos), preço de bomba e custo do próprio
 * mês: **antes R$ 11.406,05 → depois R$ 5.640,91** — o card prometia
 * R$ 5.765,14 a mais, mais que o dobro do previsto real.
 *
 * Divergência que FICA, documentada e não medida (não há série de
 * `preco_custo` de cadastro no dado de referência): em produção o card usa o
 * `preco_custo` de HOJE do cadastro, não o custo médio do mês.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, somarDespesas } from '@posto/utils';
import { lucroPrevistoEstoque, valorBrutoEstoque } from './calculos-resumo-financeiro';

const SQLITE = `${import.meta.dir}/../../../../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

/** Julho por produto: litros vendidos, receita, custo do mês e régua final. */
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
    const reguas = new Map(
        (
            db
                .query('SELECT produto, estoque_tanque FROM estoque_mensal WHERE ano=2026 AND mes=7')
                .all() as { produto: string; estoque_tanque: number }[]
        ).map((l) => [l.produto, l.estoque_tanque])
    );
    return [...porProduto.entries()].map(([produto, v]) => ({
        produto,
        litros: v.litros,
        precoVenda: v.valor / v.litros,
        custoMedio: custos.get(produto)!,
        estoque: reguas.get(produto)!,
    }));
}

const despesaJulho = (): number =>
    somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=7')
            .all() as { categoria: string | null; valor: number | null }[]
    );

test('consolidado: o card É a projeção canônica — antes prometia R$ 5.765,14 a mais (julho)', () => {
    const produtos = julhoPorProduto();
    const litrosVendidos = produtos.reduce((s, p) => s + p.litros, 0);
    const despLt = despesaOperacionalPorLitro(despesaJulho(), litrosVendidos);
    expect(despLt).toBeCloseTo(0.598789, 5);

    // A conta REAL do card, alimentada com preço de bomba e custo do mês.
    const tanques = produtos.map((p) => ({
        estoque_atual: p.estoque,
        combustivel: { preco_venda: p.precoVenda, preco_custo: p.custoMedio },
    }));
    const doCard = lucroPrevistoEstoque(tanques, despLt);

    // Projeção canônica do MESMO estoque: desconta a despesa operacional/L.
    const canonico = produtos.reduce(
        (s, p) => s + p.estoque * (p.precoVenda - p.custoMedio - despLt),
        0
    );

    expect(doCard).toBeCloseTo(canonico, 2);
    expect(doCard).toBeCloseTo(5_640.91, 1);

    // O ANTES, como régua do que mudou na tela: sem o desconto da despesa o
    // mesmo estoque prometia R$ 11.406,05 — R$ 5.765,14 a mais.
    const antes = lucroPrevistoEstoque(tanques, 0);
    expect(antes).toBeCloseTo(11_406.05, 1);
    expect(antes - doCard).toBeCloseTo(5_765.14, 1);

    // E o estoque que sustenta os números é a régua real de julho.
    expect(produtos.reduce((s, p) => s + p.estoque, 0)).toBeCloseTo(9_628.0, 1);
});

test('valor bruto em estoque é estoque × custo — sem divergência, congelado por completude', () => {
    const produtos = julhoPorProduto();
    const tanques = produtos.map((p) => ({
        estoque_atual: p.estoque,
        combustivel: { preco_venda: p.precoVenda, preco_custo: p.custoMedio },
    }));
    const esperado = produtos.reduce((s, p) => s + p.estoque * p.custoMedio, 0);
    expect(valorBrutoEstoque(tanques)).toBeCloseTo(esperado, 6);
});
