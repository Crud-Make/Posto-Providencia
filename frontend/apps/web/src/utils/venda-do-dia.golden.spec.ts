/**
 * Golden do `total_vendas` do PAINEL pelo encerrante — `vendaDoDiaPeloEncerrante` REAL, com os
 * tipos de UI e as strings BR que a tela manda, sobre os 31 dias reais de janeiro/2026 (#103 P8).
 *
 * @remarks
 * É o par de `packages/utils/src/total-vendas-encerrante.golden.spec.ts`: lá o pacote prova a
 * fórmula; aqui se prova que o CAMINHO DO PAINEL (parse BR → `valorDaLeitura` por bico →
 * `totalVendasDoEncerrante`) chega ao MESMO número, dia a dia.
 *
 * Forma das asserções (a de c61e4c8, `totais-do-dia.golden.spec.ts`): o lado do módulo entra
 * CRU e só o esperado é quantizado. Nada de `centavos()` sobre o que a função devolve — é isso
 * que faz o golden morder quando alguém troca a soma por float (canário B do pacote, replicado
 * aqui: sem essa forma, a mutação `acc + v` passava verde).
 *
 * O que fica provado, nos 31 dias:
 *   (a) ao preço DO DIA, o painel reproduz a planilha a ≤ 1 centavo, com o resíduo EXATO de cada
 *       dia — o mesmo `RESIDUO_DA_PRECISAO` do pacote. O resíduo é da fonte: a planilha soma
 *       linhas cruas, e a vencedora quantiza cada parcela (`leitura.ts:82`), como `numeric(15,2)`
 *       guarda cada `Leitura.valor_total`. Não é float e não é o painel;
 *   (b) o número já sai quantizado: `totalVendas === emCentavos(totalVendas)`;
 *   (c) painel e pacote dão o MESMO número — a terceira via do painel deixou de existir;
 *   (d) I8: tirar a leitura de UM dos 6 bicos dá `null`, nunca a venda dos outros 5;
 *   (e) ao preço de HOJE (`bico.combustivel.preco_venda`, que é o que a tela entrega), a
 *       divergência de PREÇO continua inteira: R$ 23.784,56 no mês, pior dia 2, menor dia 14.
 *       Fica a ≤ 2 centavos por dia da medida do legado (`calcularTotais`, em float com
 *       quantização tardia: R$ 23.784,61) — os 5 centavos são a somadora; os R$ 23.784 são o
 *       preço, e esta fatia NÃO os apaga (Design Doc §7 d).
 *
 * Roda sob `bun run test:golden`; o vitest ignora (`*.spec.ts`).
 */
import { Database } from 'bun:sqlite';
import { test, expect } from 'bun:test';
import { emCentavos, totalVendasDoEncerrante } from '@posto/utils';
import type { BicoComDetalhes } from '../types/fechamento';
import { formatarParaBR } from './formatters';
import { vendaDoDiaPeloEncerrante, type LeiturasDaTela } from './venda-do-dia';

const DB_PATH = `${import.meta.dir}/../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(DB_PATH, { readonly: true });

const ANO = 2026;
const MES = 1;
/** O cadastro do posto em janeiro: seis bicos. Na tela é `bicos.length`, já filtrado por `ativo`. */
const BICOS_ATIVOS = 6;

/** Reais para centavos inteiros, normalizando o `-0` — só para o lado ESPERADO e para diferenças. */
const centavos = (reais: number): number => {
    const n = Math.round(reais * 100);
    return n === 0 ? 0 : n;
};

interface LinhaDeBico {
    dia: number;
    bico: string;
    inicial: number;
    fechamento: number;
    litros: number;
    valor_lt: number | null;
    venda_bico: number;
}

const linhas = db
    .query<LinhaDeBico, [number, number]>(
        `SELECT dia, bico, inicial, fechamento, litros, valor_lt, venda_bico
           FROM encerrante_diario WHERE ano = ? AND mes = ? ORDER BY dia, bico`
    )
    .all(ANO, MES);

const planilha = db
    .query<{ dia: number; venda_concentrador_total: number }, [number, number]>(
        `SELECT dia, venda_concentrador_total FROM fechamento_diario
          WHERE ano = ? AND mes = ? ORDER BY dia`
    )
    .all(ANO, MES);

const linhasDoDia = (dia: number): LinhaDeBico[] => linhas.filter((l) => l.dia === dia);

/** Preço do dia; o Bico 06 sai do ETL sem preço e vende ao da gasolina comum (Bico 01). */
function precoDoDia(l: LinhaDeBico): number {
    const preco = l.valor_lt ?? linhasDoDia(l.dia).find((x) => x.bico === 'G,C. Bico 01')?.valor_lt;
    if (preco == null) throw new Error(`sem preço no dia ${l.dia} para ${l.bico}`);
    return preco;
}

/** O preço de HOJE: o do último dia completo da extração (24/07/2026), como no golden do pacote. */
const PRECO_HOJE: Readonly<Record<string, number>> = {
    'DS:.10,Bico 04': 7.38,
    'Etanol,Bico 03': 4.98,
    'G,A.Bico 02': 6.98,
    'G,C, Bico 05': 6.98,
    'G,C. Bico 01': 6.98,
    'G,C. Bico 06': 6.98,
};
const precoDeHoje = (l: LinhaDeBico): number => PRECO_HOJE[l.bico] ?? 0;

/** `planilha − encerrante`, em centavos, dias 1..31 — o mesmo do pacote (`total-vendas-encerrante.golden.spec.ts`). */
const RESIDUO_DA_PRECISAO: readonly number[] = [
    0, 0, 0, -1, 0, 1, 0, -1, 0, 0, -1, 0, 1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0,
    0, 0, 1, 0,
];

/** Medido em 20/09/2026 sobre o LEGADO (`calcularTotais`, float): `painel ao preço de hoje − encerrante`, em centavos. */
const DIVERGENCIA_DO_LEGADO_POR_DIA: readonly number[] = [
    107350, 128198, 113519, 111656, 108621, 95303, 67541, 68467, 58373, 59632, 62602,
    93273, 77916, 43159, 61539, 85399, 57991, 71836, 116920, 87051, 65765, 58636,
    52633, 67500, 45234, 89144, 51778, 82325, 50540, 76343, 62217,
];

/**
 * Medido em 22/09/2026 sobre ESTA função: `painel ao preço de hoje − encerrante`, em centavos.
 * Difere do legado em 20 dias, por 1–2 centavos, porque quantiza cada parcela em vez de somar em
 * float e quantizar no fim; no mês, 5 centavos a menos (R$ 23.784,56).
 */
const DIVERGENCIA_POR_DIA: readonly number[] = [
    107349, 128199, 113519, 111655, 108620, 95301, 67541, 68468, 58374, 59633, 62603,
    93272, 77914, 43159, 61539, 85400, 57992, 71836, 116919, 87050, 65765, 58635,
    52634, 67500, 45232, 89144, 51778, 82326, 50540, 76342, 62217,
];

/** Monta os `BicoComDetalhes` que a tela entrega ao hook, com o preço pedido. */
function bicosDoDia(dia: number, preco: (l: LinhaDeBico) => number): BicoComDetalhes[] {
    return linhasDoDia(dia).map((l, i) => ({
        id: i + 1,
        numero: i + 1,
        ativo: true,
        bomba_id: 1,
        combustivel_id: i + 1,
        tanque_id: null,
        posto_id: 1,
        bomba: { id: 1, nome: 'Bomba 1', localizacao: null, ativo: true, posto_id: 1 },
        combustivel: {
            id: i + 1,
            nome: l.bico,
            codigo: l.bico,
            cor: null,
            ativo: true,
            preco_custo: 0,
            preco_venda: preco(l),
            posto_id: 1,
        },
    }));
}

/** As leituras como a tela guarda: strings BR com 3 casas, indexadas pelo id do bico. */
function leiturasDoDia(dia: number): Record<number, { inicial: string; fechamento: string }> {
    const leituras: Record<number, { inicial: string; fechamento: string }> = {};
    linhasDoDia(dia).forEach((l, i) => {
        leituras[i + 1] = { inicial: formatarParaBR(l.inicial, 3), fechamento: formatarParaBR(l.fechamento, 3) };
    });
    return leituras;
}

/** O vencedor do pacote, sobre `Leitura.valor_total` como o banco guarda (2 casas). */
const vencedor = (dia: number): number =>
    totalVendasDoEncerrante(linhasDoDia(dia).map((l) => emCentavos(l.venda_bico)), BICOS_ATIVOS) ?? Number.NaN;

test('janeiro tem 31 dias, com 6 bicos lidos em cada um — e a tela entrega 6 leituras', () => {
    expect(planilha).toHaveLength(31);
    for (const p of planilha) {
        expect(bicosDoDia(p.dia, precoDoDia)).toHaveLength(BICOS_ATIVOS);
        expect(Object.keys(leiturasDoDia(p.dia))).toHaveLength(BICOS_ATIVOS);
    }
});

for (const p of planilha) {
    test(`(a) ao preço do dia, o painel reproduz a planilha a 1 centavo, com o resíduo exato — dia ${p.dia}`, () => {
        const residuo = RESIDUO_DA_PRECISAO[p.dia - 1] ?? Number.NaN;
        expect(Math.abs(residuo)).toBeLessThanOrEqual(1);

        const r = vendaDoDiaPeloEncerrante(bicosDoDia(p.dia, precoDoDia), leiturasDoDia(p.dia));
        // Lado do módulo CRU; só o esperado é quantizado. `planilha − resíduo` é o encerrante.
        expect(r.totalVendas).toBe(emCentavos(p.venda_concentrador_total - residuo / 100));

        const litros = linhasDoDia(p.dia).reduce((a, l) => a + l.litros, 0);
        expect(Math.abs(r.totalLitros - litros)).toBeLessThan(1e-6);
    });

    test(`(b) o número já sai quantizado em centavos, e (c) é o MESMO do pacote — dia ${p.dia}`, () => {
        const r = vendaDoDiaPeloEncerrante(bicosDoDia(p.dia, precoDoDia), leiturasDoDia(p.dia));
        expect(r.totalVendas).not.toBeNull();
        if (r.totalVendas === null) return;

        // Canário B: sem `centavos()` no meio, de propósito — é o que pega a soma em float.
        expect(r.totalVendas).toBe(emCentavos(r.totalVendas));
        expect(r.totalVendas).toBe(vencedor(p.dia));
    });

    test(`(d) I8: cinco bicos lidos de seis é dia NÃO apurado — null, não a venda dos cinco — dia ${p.dia}`, () => {
        const bicos = bicosDoDia(p.dia, precoDoDia);
        const todas = leiturasDoDia(p.dia);

        const semABico1: LeiturasDaTela = Object.fromEntries(Object.entries(todas).filter(([id]) => id !== '1'));
        expect(vendaDoDiaPeloEncerrante(bicos, semABico1).totalVendas).toBeNull();

        // A leitura-base (`fechamento: ''`) também não conta como bico lido.
        const bico1 = todas[1];
        if (bico1 === undefined) throw new Error('sem bico 1');
        const comBaseNoBico1: LeiturasDaTela = { ...todas, 1: { inicial: bico1.inicial, fechamento: '' } };
        expect(vendaDoDiaPeloEncerrante(bicos, comBaseNoBico1).totalVendas).toBeNull();

        expect(vendaDoDiaPeloEncerrante(bicos, {}).totalVendas).toBeNull();
    });

    test(`(e) ao preço de hoje, a divergência de PREÇO continua inteira — dia ${p.dia}`, () => {
        const r = vendaDoDiaPeloEncerrante(bicosDoDia(p.dia, precoDeHoje), leiturasDoDia(p.dia));
        expect(r.totalVendas).not.toBeNull();
        if (r.totalVendas === null) return;

        const divergencia = DIVERGENCIA_POR_DIA[p.dia - 1] ?? Number.NaN;
        // Lado do módulo CRU: o esperado é `encerrante + divergência`, quantizado.
        expect(r.totalVendas).toBe(emCentavos(vencedor(p.dia) + divergencia / 100));
        expect(divergencia).toBeGreaterThan(0);

        // A somadora nova fica a ≤ 2 centavos da do legado: a causa é o preço, não a soma.
        const doLegado = DIVERGENCIA_DO_LEGADO_POR_DIA[p.dia - 1] ?? Number.NaN;
        expect(Math.abs(divergencia - doLegado)).toBeLessThanOrEqual(2);
    });
}

test('(a) o resíduo de precisão do mês é −2 centavos, como no pacote', () => {
    expect(RESIDUO_DA_PRECISAO).toHaveLength(31);
    expect(RESIDUO_DA_PRECISAO.reduce((a, b) => a + b, 0)).toBe(-2);
});

test('(e) a divergência de preço de janeiro é R$ 23.784,56; pior dia 2 (R$ 1.281,99); menor dia 14 (R$ 431,59)', () => {
    expect(DIVERGENCIA_POR_DIA).toHaveLength(31);
    expect(DIVERGENCIA_POR_DIA.reduce((a, b) => a + b, 0)).toBe(2378456);
    expect(Math.max(...DIVERGENCIA_POR_DIA)).toBe(128199);
    expect(DIVERGENCIA_POR_DIA.indexOf(128199) + 1).toBe(2);
    expect(Math.min(...DIVERGENCIA_POR_DIA)).toBe(43159);
    expect(DIVERGENCIA_POR_DIA.indexOf(43159) + 1).toBe(14);

    // Contra o legado em float (R$ 23.784,61): 5 centavos no mês são a somadora; o resto é preço.
    expect(DIVERGENCIA_DO_LEGADO_POR_DIA.reduce((a, b) => a + b, 0)).toBe(2378461);
    const medido = planilha.reduce((acc, p) => {
        const r = vendaDoDiaPeloEncerrante(bicosDoDia(p.dia, precoDeHoje), leiturasDoDia(p.dia));
        return acc + centavos(r.totalVendas ?? Number.NaN) - centavos(vencedor(p.dia));
    }, 0);
    expect(medido).toBe(2378456);
});

test('as 6 linhas de litros zero de janeiro vendem R$ 0,00: contam como lidas e não movem o total', () => {
    const zeradas = linhas.filter((l) => l.litros === 0);
    expect(zeradas).toHaveLength(6);
    for (const z of zeradas) {
        const bicos = bicosDoDia(z.dia, precoDoDia);
        const r = vendaDoDiaPeloEncerrante(bicos, leiturasDoDia(z.dia));
        // Lida com zero litro é bico lido: o dia segue apurado, e a parcela vale zero.
        expect(r.totalVendas).not.toBeNull();
        expect(r.totalVendas).toBe(vencedor(z.dia));
    }
});
