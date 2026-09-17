/**
 * Golden master do LUCRO REAL contra os 7 meses de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`, montado pelo estágio 2 do ETL.
 * Roda sob `bun test`; vitest ignora (`*.spec.ts`).
 *
 * Complementa `lucro.golden.spec.ts`, que cobre só o mês 01 pelo fixture JSON.
 * Aqui a granularidade é a mesma (mensal), mas a cobertura vai a 7 meses × 42 bicos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DUAS LISTAS DE DESPESA, EM LUGARES DIFERENTES — E SÓ UMA É COMPLETA.
 *
 *   `despesa_categoria_mensal` .. R$ 140.456,27 — o que a PLANILHA acompanha
 *   `despesa_lancada` ........... R$ 195.230,40 — o que o posto REALMENTE gasta
 *
 * A segunda não sai da planilha: vem da tabela `Despesa` do app, exportada por
 * `scripts/etl-despesa-banco.py`. São 108 lançamentos nos 7 meses de 2026,
 * conferidos contra produção em 12/08/2026. A diferença de R$ 54.774,13 são
 * gastos que a planilha simplesmente não registra: Embasa, Net, Luz, extintor,
 * conserto de bomba, Bombeiro AVCB, e salários lançados a R$ 2.100.
 *
 * O BLOCO DE LUCRO DA PLANILHA USA A LISTA DELA — a menor. Logo o lucro que ela
 * exibe (R$ 220.559,42 / 11,48%) ignora R$ 54.774,13 de despesa real e
 * superestima o resultado dos 7 meses em ~25%. Pelo CLAUDE.md §6 — "toda despesa
 * do posto entra no rateio, sem exceção" — o lucro real é R$ 165.785,32 / 8,63%.
 *
 * ⚠️ O NOME ERRADO QUE CUSTOU CARO. Entre 31/07 e 12/08 esta lista se chamava
 * `despesa_trimestral` e era descrita como "uma segunda aba da planilha". Nunca
 * foi: não existe apuração trimestral no posto, e nenhuma das 12 abas a contém —
 * varredura de toda célula, por rótulo e por valor, em 12/08. O nome errado levou
 * a suíte a ser lida como quebrada e quase custou a remoção deste golden inteiro,
 * que estava CERTO no número e errado só na etiqueta. Dado sem procedência escrita
 * é dado que alguém vai apagar por engano.
 *
 * Este golden trava as DUAS coisas de propósito:
 *   1. que a fórmula reproduz a planilha quando alimentada com a lista DELA
 *      (prova que o cálculo está certo — o que muda é a entrada, não a fórmula);
 *   2. que o lucro real, com a despesa lançada, é o de `LUCRO_REAL_ESPERADO`.
 *
 * Se qualquer um dos dois se mexer, o teste quebra e alguém decide de novo, em vez
 * de o número escorregar em silêncio.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, lucroCombustivel, margemPercentual } from './lucro';
import { somarDespesas } from './despesa';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Dinheiro arredonda ao centavo por bico; R$ 0,05 cobre o acúmulo em 6 bicos. */
const TOL = 0.05;

const MESES = [1, 2, 3, 4, 5, 6, 7] as const;

interface LinhaBico {
    bico: string;
    litros: number;
    valor_lt: number | null;
    venda: number;
    lucro_bico: number | null;
}

/**
 * Custo médio de compra vem por PRODUTO; o resumo mensal vem por BICO.
 * O prefixo do nome do bico é o que liga os dois — mesma regra do fixture do mês 01.
 */
const produtoDoBico = (bico: string): string => {
    if (bico.startsWith('G,C')) return 'G,Comum.';
    if (bico.startsWith('G,A')) return 'G,Aditivada.';
    if (bico.startsWith('Etanol')) return 'Etanol.';
    if (bico.startsWith('Ds')) return 'Ds.10.';
    throw new Error(`produto sem custo mapeado: ${bico}`);
};

const bicosDoMes = (mes: number): LinhaBico[] =>
    db
        .query<LinhaBico, [number]>(
            'SELECT bico, litros, valor_lt, venda, lucro_bico FROM resumo_mensal_bico WHERE ano=2026 AND mes=? ORDER BY bico'
        )
        .all(mes);

const custosDoMes = (mes: number): Record<string, number> => {
    const mapa: Record<string, number> = {};
    for (const c of db
        .query<{ produto: string; media_lt: number }, [number]>(
            'SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=?'
        )
        .all(mes)) {
        mapa[c.produto] = c.media_lt;
    }
    return mapa;
};

/** Lista MENSAL — a que o bloco de lucro da planilha usa. */
const despesaMensal = (mes: number): number =>
    db.query<{ v: number }, [number]>('SELECT valor v FROM despesa_mensal WHERE ano=2026 AND mes=?').get(mes)?.v ?? 0;

/** Despesa REALMENTE lançada, vinda da tabela `Despesa` do app. */
const despesaLancada = (mes: number): number =>
    somarDespesas(
        db
            .query<{ categoria: string | null; valor: number | null }, [number]>(
                'SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=?'
            )
            .all(mes)
    );

/** Lucro do mês somando bico a bico, com a despesa rateada por litro. */
const lucroDoMes = (mes: number, despesaTotal: number): number => {
    const bicos = bicosDoMes(mes);
    const custos = custosDoMes(mes);
    const litros = bicos.reduce((s, b) => s + b.litros, 0);
    const despOp = despesaOperacionalPorLitro(despesaTotal, litros);
    return bicos.reduce(
        (s, b) =>
            s +
            lucroCombustivel({
                litros: b.litros,
                // Bico 06 tem valor_lt nulo na planilha; deriva-se o preço da venda.
                precoVenda: b.valor_lt ?? b.venda / b.litros,
                custoMedio: custos[produtoDoBico(b.bico)],
                despesaOperacionalLitro: despOp,
            }),
        0
    );
};

// ─── 1. A FÓRMULA ESTÁ CERTA ────────────────────────────────────────────────
// Alimentada com a MESMA lista de despesa que a planilha usa, ela tem de
// reproduzir o lucro que a planilha calculou. Sem tolerância folgada: centavos.

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: fórmula reproduz o lucro da planilha (despesa mensal)`, () => {
        const planilha = bicosDoMes(mes).reduce((s, b) => s + (b.lucro_bico ?? 0), 0);
        const calculado = lucroDoMes(mes, despesaMensal(mes));
        expect(Math.abs(calculado - planilha)).toBeLessThan(TOL);
    });
}

test('7 meses: fórmula reproduz o lucro total da planilha (despesa mensal)', () => {
    const planilha = MESES.reduce(
        (s, m) => s + bicosDoMes(m).reduce((a, b) => a + (b.lucro_bico ?? 0), 0),
        0
    );
    const calculado = MESES.reduce((s, m) => s + lucroDoMes(m, despesaMensal(m)), 0);
    expect(Math.abs(calculado - planilha)).toBeLessThan(TOL);
    // Valor de referência apurado em 31/07/2026.
    expect(Math.abs(planilha - 220_559.42)).toBeLessThan(TOL);
});

// ─── 2. O LUCRO REAL ────────────────────────────────────────────────────────
// Mesma fórmula, alimentada com a despesa que o posto de fato lançou.
// Estes números são a referência do negócio.

/**
 * Lucro real por mês, com a despesa lançada. Apurado em 31/07/2026 e reconferido
 * contra a tabela `Despesa` de produção em 12/08/2026 — os R$ 195.230,40 dos 7
 * meses batem ao centavo, em 108 lançamentos.
 */
const LUCRO_REAL_ESPERADO: Record<number, number> = {
    1: 15_609.86,
    2: 20_774.17,
    3: 34_756.23,
    4: 29_329.10,
    5: 21_463.38,
    6: 25_580.27,
    7: 18_272.31,
};

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: lucro REAL com a despesa lançada`, () => {
        const real = lucroDoMes(mes, despesaLancada(mes));
        expect(Math.abs(real - LUCRO_REAL_ESPERADO[mes])).toBeLessThan(TOL);
    });
}

test('7 meses: lucro real, despesa total e margem', () => {
    const litros = MESES.reduce((s, m) => s + bicosDoMes(m).reduce((a, b) => a + b.litros, 0), 0);
    const receita = MESES.reduce((s, m) => s + bicosDoMes(m).reduce((a, b) => a + b.venda, 0), 0);
    const despLanc = MESES.reduce((s, m) => s + despesaLancada(m), 0);
    const despMen = MESES.reduce((s, m) => s + despesaMensal(m), 0);
    const lucroReal = MESES.reduce((s, m) => s + lucroDoMes(m, despesaLancada(m)), 0);

    expect(Math.abs(litros - 283_506.34)).toBeLessThan(0.01);
    expect(Math.abs(receita - 1_921_455.03)).toBeLessThan(TOL);
    expect(Math.abs(despMen - 140_456.27)).toBeLessThan(TOL);
    expect(Math.abs(despLanc - 195_230.40)).toBeLessThan(TOL);
    expect(Math.abs(lucroReal - 165_785.32)).toBeLessThan(TOL);

    // A margem real é ~8,6%, não os ~11,5% que a planilha exibe.
    expect(margemPercentual(lucroReal, receita)).toBeCloseTo(8.63, 1);
});

test('a despesa lançada supera a da planilha em R$ 54.774,13 nos 7 meses', () => {
    const despLanc = MESES.reduce((s, m) => s + despesaLancada(m), 0);
    const despMen = MESES.reduce((s, m) => s + despesaMensal(m), 0);
    expect(Math.abs(despLanc - despMen - 54_774.13)).toBeLessThan(TOL);
});

// ─── 3. A ARMADILHA DA LINHA DE TOTAL ───────────────────────────────────────
// Somar a coluna crua devolve exatamente o dobro. Travado aqui para que, se o
// ETL parar de trazer a linha de total, alguém veja — em vez de o rateio mudar sozinho.

test('somar a coluna crua de despesa_categoria_mensal devolve o DOBRO', () => {
    const linhas = db
        .query<{ categoria: string | null; valor: number | null }, []>(
            'SELECT categoria, valor FROM despesa_categoria_mensal WHERE ano=2026'
        )
        .all();
    const cru = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
    const limpo = somarDespesas(linhas);

    expect(Math.abs(limpo - 140_456.27)).toBeLessThan(TOL);
    expect(Math.abs(cru - limpo * 2)).toBeLessThan(TOL);
});

/**
 * `despesa_lancada` cobre exatamente os meses já lançados no app — hoje, 7.
 *
 * @remarks Conferido contra produção em 12/08/2026: 108 lançamentos, meses 01 a 07,
 *          nada em agosto–dezembro. A versão anterior deste teste exigia 12 meses e um
 *          excedente de R$ 31.710,88 lançado à frente; isso descrevia a tabela antiga
 *          (`despesa_trimestral`), não a `Despesa` do app, e nunca foi verdade aqui.
 *          O teste continua existindo para que o dia em que alguém lançar despesa de
 *          agosto o excedente apareça — em vez de entrar calado no rateio de 7 meses.
 */
test('despesa_lancada cobre só os meses lançados — filtrar por mês é obrigatório', () => {
    const meses = db
        .query<{ mes: number }, []>('SELECT DISTINCT mes FROM despesa_lancada WHERE ano=2026 ORDER BY mes')
        .all()
        .map((r) => r.mes);
    expect(meses).toEqual([...MESES]);

    const todosOsMeses = somarDespesas(
        db
            .query<{ categoria: string | null; valor: number | null }, []>(
                'SELECT categoria, valor FROM despesa_lancada WHERE ano=2026'
            )
            .all()
    );
    const seteMeses = MESES.reduce((s, m) => s + despesaLancada(m), 0);
    expect(Math.abs(todosOsMeses - seteMeses)).toBeLessThan(TOL);
});

/**
 * `despesa_lancada` NÃO tem linha de total — e é por isso que ela não cai na armadilha
 * que `despesa_categoria_mensal` tem.
 *
 * @remarks A da planilha carrega a linha `Total.` no meio das categorias, porque a
 *          planilha a tem e o ETL é fiel à fonte; somar a coluna crua lá devolve o dobro.
 *          A do banco são lançamentos individuais, sem consolidação. Travar a diferença
 *          aqui evita que alguém "conserte" uma na direção da outra.
 */
test('somar a coluna crua de despesa_lancada NÃO dobra — não há linha de total', () => {
    const linhas = db
        .query<{ categoria: string | null; valor: number | null }, []>(
            'SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes BETWEEN 1 AND 7'
        )
        .all();
    const cru = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
    const limpo = somarDespesas(linhas);

    expect(Math.abs(limpo - 195_230.40)).toBeLessThan(TOL);
    expect(Math.abs(cru - limpo)).toBeLessThan(TOL);
});

test('despesa_mensal e despesa_categoria_mensal são a MESMA lista', () => {
    for (const mes of MESES) {
        const porCategoria = somarDespesas(
            db
                .query<{ categoria: string | null; valor: number | null }, [number]>(
                    'SELECT categoria, valor FROM despesa_categoria_mensal WHERE ano=2026 AND mes=?'
                )
                .all(mes)
        );
        expect(Math.abs(porCategoria - despesaMensal(mes))).toBeLessThan(TOL);
    }
});
