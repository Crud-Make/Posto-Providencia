/**
 * Golden master do RESUMO POR PRODUTO contra os 7 meses reais de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite` — extração crua da planilha
 * (estágio 1 do ETL). Roda sob `bun run test:golden`; o Vitest ignora `*.spec.ts`.
 *
 * Três tabelas entram aqui, e nenhuma delas é calculada pelo ETL — as três são
 * leitura direta de célula da aba de resumo:
 *
 * - `resumo_mensal_bico` — litros, venda e o `Lucro,bico, R$.` da planilha, que é
 *   o **gabarito**: o número que o dono confere;
 * - `compra_mensal`      — compra em litros e em reais, de onde sai o custo médio;
 * - `despesa_mensal`     — a despesa do mês, numerador do rateio por litro.
 *
 * O que se prova aqui: alimentado com as MESMAS entradas da planilha, o
 * `resumoPorProduto` reproduz o lucro de cada bico ao centavo, nos 7 meses.
 * Medido em 16/08/2026: as 42 linhas batem exatamente, e o total do mês diverge
 * no máximo 1 centavo por arredondamento de soma.
 *
 * ⚠️ O que este golden NÃO cobre — e por quê. Aqui o preço vem de
 * `venda ÷ litros` da própria planilha. Na tela, o preço é o médio ponderado dos
 * dias realmente lançados, e a venda é a soma do que entrou dia a dia. Os dois
 * divergem em todo mês que teve mudança de preço: em janeiro/2026, R$ 290.062,92
 * (dia a dia) contra R$ 292.400,60 (planilha, preço único), com litros idênticos
 * ao mililitro. É a mesma divergência já registrada em
 * `encerrante-mensal.golden.spec.ts`, e a decisão é a mesma: quem manda é o
 * dinheiro que entrou. Este arquivo prova a FÓRMULA; o encerrante prova a
 * AGREGAÇÃO.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { resumoPorProduto, type EntradaBicoMes } from './resumo-produto';
import { despesaOperacionalPorLitro } from './lucro';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Bate ao centavo; a tolerância só cobre o arredondamento da fonte. */
const TOL_REAIS = 0.01;
/** O total acumula 6 arredondamentos de bico. */
const TOL_TOTAL = 0.02;

/**
 * Bico → produto, como a planilha agrupa.
 *
 * @remarks Três bicos vendem Gasolina Comum (01, 05 e 06) — é isso que faz a
 *          participação da comum ser ~62% do volume, e não três fatias de 20%.
 *
 *          O bico 04 aparece como `Ds:.500` na aba de resumo e como `DS:.10` no
 *          bloco de dia e em `validacao_mensal`; a compra chama o produto de
 *          `Ds.10.`. **Confirmado com o dono em 16/08/2026: é Diesel S10.** O
 *          `Ds:.500` é rótulo errado digitado na planilha, não um segundo
 *          produto — não existe S500 no posto. O mapeamento segue a compra, que
 *          é de onde vem o custo, e por isso já estava certo.
 */
const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

interface LinhaResumo {
    mes: number;
    bico: string;
    inicial: number | null;
    fechamento: number | null;
    litros: number;
    venda: number;
    lucro_bico: number | null;
}

interface LinhaCompra {
    produto: string;
    compra_lt: number;
    compra_rs: number;
}

const meses = db
    .query('SELECT DISTINCT mes FROM resumo_mensal_bico ORDER BY mes')
    .all() as { mes: number }[];

test('a planilha tem os 7 meses de 2026 no resumo por bico', () => {
    expect(meses.map((m) => m.mes)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

for (const { mes } of meses) {
    const linhas = db
        .query('SELECT * FROM resumo_mensal_bico WHERE mes = ?')
        .all(mes) as LinhaResumo[];
    const compras = db
        .query('SELECT * FROM compra_mensal WHERE mes = ?')
        .all(mes) as LinhaCompra[];
    const despesa =
        (db.query('SELECT valor FROM despesa_mensal WHERE mes = ?').get(mes) as
            | { valor: number }
            | undefined)?.valor ?? 0;

    const custoMedio = new Map(
        compras.map((c) => [c.produto, c.compra_lt > 0 ? c.compra_rs / c.compra_lt : 0])
    );
    const litrosDoMes = linhas.reduce((acc, l) => acc + l.litros, 0);
    const rateio = despesaOperacionalPorLitro(despesa, litrosDoMes);

    const entradas: EntradaBicoMes[] = linhas.map((l) => {
        const produto = PRODUTO_DO_BICO[l.bico];
        return {
            bico: l.bico,
            produto,
            inicial: l.inicial,
            fechamento: l.fechamento,
            litros: l.litros,
            venda: l.venda,
            // O bico 06 não tem `Valor LT R$` em nenhum mês da planilha — a célula é
            // vazia, mas venda e lucro existem. O preço sai de venda ÷ litros, que é
            // o mesmo caminho que a tela usa.
            precoMedio: l.litros > 0 ? l.venda / l.litros : null,
            custoMedio: custoMedio.get(produto) ?? 0,
        };
    });

    const resumo = resumoPorProduto(entradas, rateio, despesa > 0);

    test(`mês ${mes}: todo bico é conhecido e tem custo de compra`, () => {
        for (const l of linhas) {
            expect(PRODUTO_DO_BICO[l.bico]).toBeDefined();
            expect(custoMedio.has(PRODUTO_DO_BICO[l.bico])).toBe(true);
        }
    });

    for (const linha of linhas) {
        const calculado = resumo.bicos.find((b) => b.bico === linha.bico);

        test(`mês ${mes} · ${linha.bico}: lucro bate com a planilha`, () => {
            expect(calculado).toBeDefined();
            expect(calculado!.lucro).toBeCloseTo(linha.lucro_bico ?? 0, 2);
        });
    }

    test(`mês ${mes}: lucro total bate com a soma da planilha`, () => {
        const somaPlanilha = linhas.reduce((acc, l) => acc + (l.lucro_bico ?? 0), 0);
        expect(Math.abs(resumo.totais.lucro - somaPlanilha)).toBeLessThanOrEqual(TOL_TOTAL);
    });

    test(`mês ${mes}: litros do produto somam os litros do mês`, () => {
        const somaProdutos = resumo.produtos.reduce((acc, p) => acc + p.litros, 0);
        expect(somaProdutos).toBeCloseTo(resumo.totais.litros, 3);
    });

    test(`mês ${mes}: participação dos produtos soma 100%`, () => {
        const soma = resumo.produtos.reduce((acc, p) => acc + p.participacaoLitros, 0);
        expect(soma).toBeCloseTo(100, 6);
    });

    test(`mês ${mes}: venda por bico bate com a planilha`, () => {
        for (const linha of linhas) {
            const calculado = resumo.bicos.find((b) => b.bico === linha.bico)!;
            expect(Math.abs(calculado.venda - linha.venda)).toBeLessThanOrEqual(TOL_REAIS);
        }
    });
}

/**
 * Janeiro é o mês auditado linha a linha contra a produção, então serve de
 * âncora explícita: se algum destes números mudar, alguém decidiu mudar a
 * fórmula e precisa dizer por quê.
 */
test('janeiro/2026: os números-âncora do dono', () => {
    const linhas = db
        .query('SELECT * FROM resumo_mensal_bico WHERE mes = 1')
        .all() as LinhaResumo[];
    const compras = db
        .query('SELECT * FROM compra_mensal WHERE mes = 1')
        .all() as LinhaCompra[];
    const despesa = (db.query('SELECT valor FROM despesa_mensal WHERE mes = 1').get() as {
        valor: number;
    }).valor;

    const custoMedio = new Map(compras.map((c) => [c.produto, c.compra_rs / c.compra_lt]));
    const litrosDoMes = linhas.reduce((acc, l) => acc + l.litros, 0);

    const resumo = resumoPorProduto(
        linhas.map((l) => ({
            bico: l.bico,
            produto: PRODUTO_DO_BICO[l.bico],
            inicial: l.inicial,
            fechamento: l.fechamento,
            litros: l.litros,
            venda: l.venda,
            precoMedio: l.venda / l.litros,
            custoMedio: custoMedio.get(PRODUTO_DO_BICO[l.bico]) ?? 0,
        })),
        despesaOperacionalPorLitro(despesa, litrosDoMes),
        true
    );

    expect(despesa).toBe(22158.46);
    expect(resumo.totais.litros).toBeCloseTo(46843.062, 3);
    expect(resumo.totais.venda).toBeCloseTo(292400.6, 1);
    expect(resumo.totais.lucro).toBeCloseTo(28974.97, 1);
    expect(resumo.totais.despesaPorLitro).toBeCloseTo(0.473, 4);

    // A comum é ~62% do volume porque três bicos a vendem — o número que se perde
    // quando a participação é calculada por bico.
    const comum = resumo.produtos.find((p) => p.produto === 'G,Comum.')!;
    expect(comum.bicos).toEqual(['G,C. Bico 01', 'G,C, Bico 05', 'G,C. Bico 06']);
    expect(comum.litros).toBeCloseTo(29007.79, 2);
    expect(comum.participacaoLitros).toBeCloseTo(61.92, 1);
});
