/**
 * Golden da reimplementação de lucro da tela de REGISTRO DE COMPRAS (sítio 3.1
 * do saneamento) contra a fórmula canônica de `@posto/utils/lucro`.
 *
 * §7 do CLAUDE.md: nenhuma consolidação sem teste rodando contra TODAS as
 * implementações. Este arquivo exercita as funções REAIS do hook (exportadas
 * de `useCalculosRegistro.ts`) lado a lado com a canônica, sobre os 7 meses
 * de `docs/data/posto_jorro_2026.sqlite`, e afirma:
 *
 *   1. nos meses reais (todos têm venda), o trio inline dá A MESMA conta da
 *      canônica, a menos da quantização (`emCentavos`, que o hook não aplica);
 *   2. a divergência REAL é o fallback próprio `litrosBase = vendidos ||
 *      comprados`: digitando a compra num mês sem venda o hook inventa uma
 *      despesa de R$ 0,5808/L que a canônica (rateio sobre litros VENDIDOS)
 *      zera — e o fallback só enxerga litros DIGITADOS, não os já salvos;
 *   3. sem compra no mês o hook devolve lucro 0; a canônica devolve `null`
 *      ("custo desconhecido"), nunca 0.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    custoMedioCompra,
    despesaOperacionalPorLitro,
    lucroCombustivel,
    somarDespesas,
} from '@posto/utils';
import {
    calcDespesaPorLitroPura,
    calcLucroBicoPura,
    calcLucroLtPura,
    calcMediaLtRsPura,
} from './useCalculosRegistro';
import type { CombustivelHibrido } from './useCombustiveisHibridos';
import { parseBRFloat } from '../../../utils/formatters';

const SQLITE = `${import.meta.dir}/../../../../../../docs/data/posto_jorro_2026.sqlite`;
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

/** Número → texto no formato que a tela digita (vírgula decimal). */
const emTexto = (n: number): string => String(n).replace('.', ',');

interface LinhaProduto {
    produto: string;
    litros: number;
    venda: number;
    compraLt: number;
    compraRs: number;
}

/** Agrega o mês por PRODUTO, como a tela de compras enxerga. */
function produtosDoMes(mes: number): LinhaProduto[] {
    const porProduto = new Map<string, LinhaProduto>();
    const bicos = db
        .query('SELECT bico, litros, valor_lt, venda FROM resumo_mensal_bico WHERE ano=2026 AND mes=?')
        .all(mes) as { bico: string; litros: number; valor_lt: number | null; venda: number }[];
    for (const b of bicos) {
        const nome = PRODUTO_DO_BICO[b.bico];
        const atual = porProduto.get(nome) ?? { produto: nome, litros: 0, venda: 0, compraLt: 0, compraRs: 0 };
        atual.litros += b.litros;
        atual.venda += b.valor_lt !== null ? b.litros * b.valor_lt : b.venda;
        porProduto.set(nome, atual);
    }
    const compras = db
        .query('SELECT produto, compra_lt, compra_rs FROM compra_mensal WHERE ano=2026 AND mes=?')
        .all(mes) as { produto: string; compra_lt: number; compra_rs: number }[];
    for (const c of compras) {
        const atual = porProduto.get(c.produto);
        if (atual) {
            atual.compraLt = c.compra_lt;
            atual.compraRs = c.compra_rs;
        }
    }
    return [...porProduto.values()];
}

const despesaLancada = (mes: number): number =>
    somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=?')
            .all(mes) as { categoria: string | null; valor: number | null }[]
    );

/**
 * Monta o estado híbrido da tela a partir da linha do produto.
 *
 * @param digitandoCompra - `true` põe a compra do mês nos campos DIGITADOS
 *        (`compra_lt`/`compra_rs`) em vez do acumulado (`compra_mes_*`): é o
 *        único jeito de alcançar o fallback, que só conta litros digitados.
 */
const hibrido = (l: LinhaProduto, semVenda = false, digitandoCompra = false): CombustivelHibrido => ({
    id: 0,
    nome: l.produto,
    codigo: l.produto,
    inicial: '0',
    fechamento: semVenda ? '0' : emTexto(l.litros),
    venda_mes_rs: semVenda ? 0 : l.venda,
    preco_venda_atual: emTexto(l.venda / l.litros),
    compra_lt: digitandoCompra ? emTexto(l.compraLt) : '',
    compra_rs: digitandoCompra ? emTexto(l.compraRs) : '',
    compra_mes_lt: digitandoCompra ? 0 : l.compraLt,
    compra_mes_rs: digitandoCompra ? 0 : l.compraRs,
    estoque_anterior: '0',
    estoque_tanque: '0',
    tem_regua_anterior: true,
});

// ─── 1. Nos meses reais, o trio inline É a conta canônica (menos a quantização) ──

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: lucro do hook = lucro canônico, a menos de centavos`, () => {
        const linhas = produtosDoMes(mes);
        const combs = linhas.map((l) => hibrido(l));
        const despesa = despesaLancada(mes);
        const litrosTotal = linhas.reduce((s, l) => s + l.litros, 0);
        const despOp = despesaOperacionalPorLitro(despesa, litrosTotal);

        // O rateio por litro é idêntico enquanto há venda no mês.
        expect(calcDespesaPorLitroPura(combs, despesa)).toBeCloseTo(despOp, 9);

        const doHook = combs.reduce((s, c) => s + calcLucroBicoPura(c, combs, despesa), 0);
        const canonico = combs.reduce((s, c) => {
            const litros = parseBRFloat(c.fechamento);
            return (
                s +
                lucroCombustivel({
                    litros,
                    precoVenda: parseBRFloat(c.preco_venda_atual),
                    custoMedio: calcMediaLtRsPura(c),
                    despesaOperacionalLitro: despOp,
                })
            );
        }, 0);

        // Diferença admissível: só a quantização por produto (4 × meio centavo).
        expect(Math.abs(doHook - canonico)).toBeLessThan(0.05);
    });
}

// ─── 2. [onda 3, grupo B] O fallback morreu: mês sem venda rateia 0 ─────────────

test('mês com compra e SEM venda: o rateio agora é 0, como a canônica — antes inventava R$ 0,5808/L', () => {
    // ANTES (congelado na onda 2, 28/08/2026): com julho sem vendas e a compra
    // do mês DIGITADA (32.000 L, R$ 18.585,76 de despesa), o fallback
    // `litrosBase = vendidos || comprados` rateava a despesa pelos litros
    // COMPRADOS e devolvia R$ 0,580805/L — e só enxergava `compra_lt` digitado,
    // nunca a compra já salva. O lucro/L de cada produto saía R$ 0,5808 menor.
    // DEPOIS: o hook delega a `despesaOperacionalPorLitro` (despesa ÷ litros
    // VENDIDOS); mês sem venda rateia 0 em toda a tela.
    const linhas = produtosDoMes(7);
    const combs = linhas.map((l) => hibrido(l, true, true));
    const despesa = despesaLancada(7);

    const doHook = calcDespesaPorLitroPura(combs, despesa);
    const canonico = despesaOperacionalPorLitro(despesa, 0);

    expect(canonico).toBe(0);
    expect(doHook).toBe(canonico);

    // Sem despesa inventada, o lucro/L é exatamente preço − custo do mês.
    for (const c of combs) {
        const custoMedio = calcMediaLtRsPura(c);
        const preco = parseBRFloat(c.preco_venda_atual);
        expect(calcLucroLtPura(c, combs, despesa)).toBeCloseTo(preco - custoMedio, 9);
    }

    // A régua do que mudou na tela, em reais: o fallback antigo daria isto.
    const litrosDigitados = combs.reduce((s, c) => s + parseBRFloat(c.compra_lt), 0);
    expect(despesa / litrosDigitados).toBeCloseTo(0.580805, 4);
});

// ─── 3. Sem compra no mês: 0 do hook × null da canônica ─────────────────────────

test('sem compra no mês: o hook devolve lucro 0; a canônica devolve custo null', () => {
    const semCompra = hibrido(
        { produto: 'G,Comum.', litros: 1000, venda: 6000, compraLt: 0, compraRs: 0 },
        false
    );
    expect(calcMediaLtRsPura(semCompra)).toBe(0);
    expect(calcLucroLtPura(semCompra, [semCompra], 500)).toBe(0);
    expect(custoMedioCompra([])).toBeNull();
});
