/**
 * Golden master do ENCERRANTE MENSAL contra os 7 meses reais de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite` — extração crua da planilha
 * `atualizado.xlsx` (estágio 1 do ETL). Roda sob `bun test`; vitest ignora
 * (`*.spec.ts`).
 *
 * Três tabelas do sqlite entram aqui:
 * - `encerrante_diario`   — 1.236 linhas, a ENTRADA da função (dia × bico)
 * - `resumo_mensal_bico`  —    42 linhas, o bloco `Caixa Dia 01 a 31` da planilha
 * - `validacao_mensal`    —    42 linhas, a lacuna já apurada pelo ETL
 *
 * ⚠️ DIVERGÊNCIA CONHECIDA E DELIBERADA — o bruto NÃO bate com a planilha.
 *
 * A planilha calcula o bruto do mês como `litros do mês × UM preço só`, digitado
 * à mão. Em março o Bico 01 teve 9 preços diferentes e o bloco mensal usa 7,28 —
 * que não é o último nem a média, é só um deles. Esta função soma o bruto de cada
 * dia com o preço daquele dia, que é o dinheiro que realmente entrou.
 *
 * Abril e julho batem exatamente porque neles o preço não mudou. Os outros meses
 * divergem, e a divergência está travada abaixo em `BRUTO_ESPERADO` — se ela
 * mudar, o teste quebra e alguém tem que decidir de novo, em vez de o número
 * escorregar em silêncio.
 *
 * Decisão registrada com o dono do posto em 2026-07-26.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { encerranteMensal, type LeituraDiariaBico } from './encerrante-mensal';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Litros são exatos ao mililitro — tolerância só cobre ruído de float da fonte. */
const TOL_LITROS = 0.002;
/** Dinheiro arredonda ao centavo por dia; R$ 1,00 cobre o acúmulo em ~180 linhas. */
const TOL_REAIS = 1.0;

interface LinhaDiaria {
    ano: number;
    mes: number;
    dia: number;
    bico: string;
    inicial: number | null;
    fechamento: number | null;
    venda_bico: number | null;
}

interface LinhaResumo {
    mes: number;
    bico: string;
    inicial: number;
    fechamento: number;
    litros: number;
    venda: number;
}

interface LinhaValidacao {
    mes: number;
    bico: string;
    litros_em_lacuna: number;
}

/**
 * O nome do bico não é estável entre as abas: o mesmo bico 04 é `DS:.10,Bico 04`
 * nos blocos diários e `Ds:.500,Bico 04` no bloco mensal. O número é o que casa.
 */
const numeroDoBico = (nome: string): string => {
    const m = nome.match(/Bico\s*(\d+)/i);
    if (!m) throw new Error(`nome de bico sem número: ${nome}`);
    return m[1].padStart(2, '0');
};

const MESES = db
    .query<{ mes: number }, []>('SELECT DISTINCT mes FROM encerrante_diario ORDER BY mes')
    .all()
    .map((r) => r.mes);

const consolidadoDoMes = (mes: number) => {
    const linhas = db
        .query<LinhaDiaria, [number]>('SELECT * FROM encerrante_diario WHERE mes = ?')
        .all(mes);

    const leituras: LeituraDiariaBico[] = linhas.map((l) => ({
        dia: l.dia,
        bico: numeroDoBico(l.bico),
        inicial: l.inicial,
        fechamento: l.fechamento,
        valorDia: l.venda_bico,
    }));

    return encerranteMensal(leituras);
};

// ── 1. O salto do encerrante bate com o bloco mensal da planilha ────────────────
// 42 casos: 7 meses × 6 bicos. É o número principal da tela.

for (const mes of MESES) {
    const consolidado = consolidadoDoMes(mes);
    const resumo = db
        .query<LinhaResumo, [number]>('SELECT * FROM resumo_mensal_bico WHERE mes = ?')
        .all(mes);

    for (const esperado of resumo) {
        const chave = numeroDoBico(esperado.bico);
        const obtido = consolidado.bicos.find((b) => b.bico === chave);

        test(`mês ${mes} · bico ${chave} · litros do mês batem com a planilha`, () => {
            expect(obtido).toBeDefined();
            expect(Math.abs((obtido as { litros: number }).litros - esperado.litros))
                .toBeLessThan(TOL_LITROS);
        });

        test(`mês ${mes} · bico ${chave} · encerrante inicial e final batem com a planilha`, () => {
            expect(obtido?.inicial).toBeCloseTo(esperado.inicial, 3);
            expect(obtido?.fechamento).toBeCloseTo(esperado.fechamento, 3);
        });
    }
}

// ── 2. Litros em Lacuna batem com o que o ETL apurou ────────────────────────────
// A coluna nova da tela. Zero em 6 meses; fevereiro tem os dias 09–15 furados.

for (const mes of MESES) {
    const consolidado = consolidadoDoMes(mes);
    const validacao = db
        .query<LinhaValidacao, [number]>('SELECT * FROM validacao_mensal WHERE mes = ?')
        .all(mes);

    for (const esperado of validacao) {
        const chave = numeroDoBico(esperado.bico);
        const obtido = consolidado.bicos.find((b) => b.bico === chave);

        test(`mês ${mes} · bico ${chave} · litros em lacuna batem com o ETL`, () => {
            expect(Math.abs((obtido as { litrosEmLacuna: number }).litrosEmLacuna - esperado.litros_em_lacuna))
                .toBeLessThan(TOL_LITROS);
        });
    }
}

test('fevereiro é o único mês com lacuna, e ela vale 9.134 L', () => {
    for (const mes of MESES) {
        const c = consolidadoDoMes(mes);
        if (mes === 2) {
            expect(c.temLacuna).toBe(true);
            expect(c.litrosEmLacuna).toBeCloseTo(9134.563, 2);
        } else {
            expect(c.temLacuna).toBe(false);
            expect(c.litrosEmLacuna).toBeCloseTo(0, 3);
        }
    }
});

test('fevereiro aponta os dias 09 a 15 como lacuna', () => {
    const c = consolidadoDoMes(2);
    for (const b of c.bicos) {
        expect(b.diasEmLacuna).toEqual([9, 10, 11, 12, 13, 14, 15]);
    }
});

// ── 3. Dia Parcial não fecha o mês ──────────────────────────────────────────────
// Julho tem encerrante inicial no dia 25 e nenhum fechamento. É por usar esse dia
// que a planilha mostra −1.861.248 L hoje. O mês tem que fechar no 24.

test('julho fecha no dia 24, não no dia 25 (que está pela metade)', () => {
    const c = consolidadoDoMes(7);
    expect(c.ultimoDiaFechado).toBe(24);
    for (const b of c.bicos) {
        expect(b.ultimoDiaFechado).toBe(24);
        expect(b.primeiroDia).toBe(1);
    }
});

test('julho até o dia 24 dá 31.038,922 L', () => {
    const c = consolidadoDoMes(7);
    expect(Math.abs(c.litros - 31038.922)).toBeLessThan(TOL_LITROS);
    expect(Math.abs(c.litrosLancados - 31038.922)).toBeLessThan(TOL_LITROS);
});

test('nenhum mês termina num dia sem fechamento', () => {
    for (const mes of MESES) {
        const c = consolidadoDoMes(mes);
        for (const b of c.bicos) {
            const linha = db
                .query<LinhaDiaria, [number, number, number]>(
                    "SELECT * FROM encerrante_diario WHERE mes = ? AND dia = ? AND bico LIKE '%Bico ' || ? || '%'"
                )
                .all(mes, b.ultimoDiaFechado as number, Number(b.bico));
            for (const l of linha) expect(l.fechamento).not.toBeNull();
        }
    }
});

// ── 4. Bruto: a divergência deliberada contra a planilha ────────────────────────

/** Bruto somado dia a dia (o nosso) × bruto do bloco mensal (a planilha). */
const BRUTO_ESPERADO: Record<number, { nosso: number; planilha: number }> = {
    1: { nosso: 290062.92, planilha: 292400.6 },
    2: { nosso: 184195.77, planilha: 241066.41 },
    3: { nosso: 288250.96, planilha: 294970.36 },
    4: { nosso: 314514.15, planilha: 314514.15 },
    5: { nosso: 289030.33, planilha: 285435.86 },
    6: { nosso: 287036.32, planilha: 285169.84 },
    7: { nosso: 207897.81, planilha: 207897.81 },
};

for (const mes of MESES) {
    test(`mês ${mes} · bruto somado dia a dia`, () => {
        const c = consolidadoDoMes(mes);
        expect(Math.abs(c.bruto - BRUTO_ESPERADO[mes].nosso)).toBeLessThan(TOL_REAIS);
    });
}

test('abril e julho batem com a planilha — são os meses sem mudança de preço', () => {
    for (const mes of [4, 7]) {
        const c = consolidadoDoMes(mes);
        expect(Math.abs(c.bruto - BRUTO_ESPERADO[mes].planilha)).toBeLessThan(TOL_REAIS);
    }
});

test('nos meses com mudança de preço a planilha diverge — divergência conhecida', () => {
    for (const mes of [1, 3, 5, 6]) {
        const c = consolidadoDoMes(mes);
        expect(Math.abs(c.bruto - BRUTO_ESPERADO[mes].planilha)).toBeGreaterThan(TOL_REAIS);
    }
});

// ── 5. A tabela do mês, do jeito que a tela mostra ──────────────────────────────

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const lt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

test('imprime a tabela de cada mês para conferência visual', () => {
    for (const mes of MESES) {
        const c = consolidadoDoMes(mes);
        const rotulo = `${String(mes).padStart(2, '0')}/2026`;
        console.log(
            `\n═══ FECHAMENTO MENSAL ${rotulo} — dia 01 a ${String(c.ultimoDiaFechado).padStart(2, '0')} ═══`
        );
        console.log(
            'Bico  ' +
                'Enc. inicial'.padStart(14) +
                'Enc. final'.padStart(14) +
                'Litros'.padStart(13) +
                'Lançado'.padStart(13) +
                'Lacuna'.padStart(11) +
                'Bruto'.padStart(15)
        );
        for (const b of c.bicos) {
            console.log(
                `  ${b.bico}  ` +
                    lt(b.inicial as number).padStart(14) +
                    lt(b.fechamento as number).padStart(14) +
                    lt(b.litros).padStart(13) +
                    lt(b.litrosLancados).padStart(13) +
                    (b.litrosEmLacuna === 0 ? '—' : lt(b.litrosEmLacuna)).padStart(11) +
                    brl(b.bruto).padStart(15)
            );
        }
        console.log(
            'TOTAL ' +
                ''.padStart(28) +
                lt(c.litros).padStart(13) +
                lt(c.litrosLancados).padStart(13) +
                (c.litrosEmLacuna === 0 ? '—' : lt(c.litrosEmLacuna)).padStart(11) +
                brl(c.bruto).padStart(15)
        );
        console.log(
            `      preço médio ${brl(c.precoMedio as number)}/L   ·   planilha: ${brl(BRUTO_ESPERADO[mes].planilha)}` +
                (c.temLacuna ? `   ·   ⚠ ${lt(c.litrosEmLacuna)} L SEM FECHAMENTO` : '')
        );
    }
    expect(MESES.length).toBe(7);
});
