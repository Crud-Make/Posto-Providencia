/**
 * Golden do `total_vendas` do dia — o ENCERRANTE contra o recálculo do painel
 * (fatia P8 do Design Doc `fechamento-diario-api.md`, decisão §7 (d) de 20/09/2026).
 *
 * @remarks
 * Há duas implementações vivas de `total_vendas`, e elas divergem em TRÊS eixos:
 *
 *   1. FONTE — o api-core (`encerrante.ts`) soma a coluna `Leitura.valor_total`
 *      JÁ GRAVADA (`numeric(15,2)`), o painel (`calculators.ts::calcularTotais`)
 *      RECALCULA `litros × preço` a partir do formulário.
 *   2. PREÇO — a coluna gravada carrega o preço do DIA DO FATO; o painel usa
 *      `bico.combustivel.preco_venda`, que é o preço de HOJE. O preço mudou no
 *      dia 7 de janeiro e várias vezes depois: reabrir janeiro hoje reavalia
 *      os 31 dias.
 *   3. QUEM ENTRA — o painel pula bico cuja leitura renderiza "-" (litros zero);
 *      o encerrante soma todas as linhas lidas e decide "não apurado" à parte.
 *
 * O dono decidiu: **vale o encerrante**. Este arquivo não decide — ele MEDE, em
 * centavos, sobre os 31 dias reais de janeiro, e trava o que mediu:
 *
 *   - Eixo 2 domina: o painel reaberto ao preço de hoje (o do último dia completo
 *     da extração, 24/07/2026) soma **R$ 23.784,61 A MAIS** no mês; pior dia é o
 *     2 (R$ 1.281,98); todos os 31 dias divergem, o menor é o 14 (R$ 431,59).
 *     Reaberto em 1º de fevereiro (preço de fim de janeiro) a divergência cai
 *     para R$ 2.337,66, toda nos dias 1–6.
 *   - Eixo 1 vale ±1 centavo em 11 dias (−2 centavos no mês) e NÃO é float: a
 *     planilha soma linhas cruas e o banco guarda cada linha arredondada a 2
 *     casas. O recálculo em float do painel, ao preço do dia, reproduz a
 *     planilha exatamente.
 *   - Eixo 3 vale R$ 0,00 em janeiro: as 6 linhas de litros zero vendem zero.
 *
 * I8 (`total_vendas` nasce NULL, nunca 0): exercitada nos 8 dias reais de 2026
 * marcados `dado_incompleto`, onde a planilha guarda −20 milhões, 0,0 e +20
 * milhões na mesma coluna. Nenhum deles vira zero.
 *
 * Roda sob `bun run test:golden`; o vitest ignora (`*.spec.ts`).
 */
import { Database } from 'bun:sqlite';
import { test, expect } from 'bun:test';
import { totalVendasDoEncerrante, litrosVendidos, valorDaLeitura } from './leitura';
import { totaisDoDia } from './fechamento';
import { emCentavos } from './lucro';

const DB_PATH = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(DB_PATH, { readonly: true });

const ANO = 2026;
const MES = 1;
/** O cadastro do posto: seis bicos. Em produção vem de `Bico.ativo`, não de constante. */
const BICOS_ATIVOS = 6;
const BICO_GASOLINA_COMUM = 'G,C. Bico 01';
const BICO_SEM_PRECO_NA_FONTE = 'G,C. Bico 06';

/** Reais para centavos inteiros, normalizando o `-0` (ver `totais-do-dia.golden.spec.ts`). */
const centavos = (reais: number): number => {
    const n = Math.round(reais * 100);
    return n === 0 ? 0 : n;
};

interface LinhaDeBico {
    mes: number;
    dia: number;
    bico: string;
    inicial: number | null;
    fechamento: number | null;
    litros: number | null;
    valor_lt: number | null;
    venda_bico: number | null;
}

interface DiaDaReferencia {
    mes: number;
    dia: number;
    venda_concentrador_total: number | null;
    dado_incompleto: number;
}

const linhas = db
    .query<LinhaDeBico, [number]>(
        `SELECT mes, dia, bico, inicial, fechamento, litros, valor_lt, venda_bico
           FROM encerrante_diario WHERE ano = ? ORDER BY mes, dia, bico`
    )
    .all(ANO);

const referencia = db
    .query<DiaDaReferencia, [number]>(
        `SELECT mes, dia, venda_concentrador_total, dado_incompleto
           FROM fechamento_diario WHERE ano = ? ORDER BY mes, dia`
    )
    .all(ANO);

const janeiro = referencia.filter((d) => d.mes === MES);
const linhasDoDia = (mes: number, dia: number): LinhaDeBico[] =>
    linhas.filter((l) => l.mes === mes && l.dia === dia);

/** Preço do dia na fonte; o Bico 06 sai do ETL sem preço e vende ao da gasolina comum. */
function precoDoDia(l: LinhaDeBico): number {
    if (l.valor_lt !== null) return l.valor_lt;
    const comum = linhasDoDia(l.mes, l.dia).find((x) => x.bico === BICO_GASOLINA_COMUM);
    if (comum?.valor_lt == null) throw new Error(`sem preço no dia ${l.mes}/${l.dia}`);
    return comum.valor_lt;
}

/** O preço vigente por bico no último dia completo da extração — o "preço de hoje". */
function precoNoDia(mes: number, dia: number): ReadonlyMap<string, number> {
    return new Map(linhasDoDia(mes, dia).map((l) => [l.bico, precoDoDia(l)]));
}
const PRECO_HOJE = precoNoDia(7, 24);
const PRECO_FIM_DE_JANEIRO = precoNoDia(1, 31);

/** O que `Leitura.valor_total` (numeric 15,2) guarda para a linha: a venda a 2 casas. */
const valorGravado = (l: LinhaDeBico): number => emCentavos(l.venda_bico ?? 0);

/** A venda pelo ENCERRANTE — o vencedor — para um dia. */
function pelosEncerrantes(mes: number, dia: number): number | null {
    const lidas = linhasDoDia(mes, dia).filter((l) => l.litros !== null);
    return totalVendasDoEncerrante(lidas.map(valorGravado), BICOS_ATIVOS);
}

/**
 * RÉPLICA das regras do antigo `calcularTotais` (apps/web/src/utils/calculators.ts):
 * recalcula litros × preço INFORMADO, acumula em float e pula a linha de
 * litros zero. O float aqui é deliberado — é o que está sendo medido, não um
 * padrão a seguir. `calcularTotais` e o `calculators.golden.spec.ts`, que provava
 * esta réplica contra a função real, foram apagados em 22/09/2026 (#103 P8): o
 * painel passou a usar `vendaDoDiaPeloEncerrante`. A réplica fica como registro
 * da medida do legado.
 */
function comoOPainel(dia: number, preco: (l: LinhaDeBico) => number): number {
    let total = 0;
    for (const l of linhasDoDia(MES, dia)) {
        const leitura = { inicial: l.inicial ?? 0, fechamento: l.fechamento ?? 0 };
        if (litrosVendidos(leitura) > 0) total += valorDaLeitura(leitura, preco(l));
    }
    return total;
}

const precoDeHoje = (l: LinhaDeBico): number => PRECO_HOJE.get(l.bico) ?? 0;
const precoDeFimDeJaneiro = (l: LinhaDeBico): number => PRECO_FIM_DE_JANEIRO.get(l.bico) ?? 0;

/** Medido em 20/09/2026: `painel ao preço de hoje − encerrante`, em centavos, dias 1..31. */
const DIVERGENCIA_POR_DIA: readonly number[] = [
    107350, 128198, 113519, 111656, 108621, 95303, 67541, 68467, 58373, 59632, 62602,
    93273, 77916, 43159, 61539, 85399, 57991, 71836, 116920, 87051, 65765, 58636,
    52633, 67500, 45234, 89144, 51778, 82325, 50540, 76343, 62217,
];
/** Medido em 20/09/2026: `planilha − encerrante`, em centavos — o custo de guardar a linha a 2 casas. */
const RESIDUO_DA_PRECISAO: readonly number[] = [
    0, 0, 0, -1, 0, 1, 0, -1, 0, 0, -1, 0, 1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0,
    0, 0, 1, 0,
];

// ── 0. A fonte ────────────────────────────────────────────────────────────────

test('janeiro tem 31 dias completos, com 6 bicos lidos em cada um', () => {
    expect(janeiro).toHaveLength(31);
    expect(janeiro.filter((d) => d.dado_incompleto !== 0)).toEqual([]);
    for (const d of janeiro) expect(linhasDoDia(MES, d.dia).filter((l) => l.litros !== null)).toHaveLength(6);
});

test('o preço de hoje é o do último dia completo da extração (24/07/2026)', () => {
    expect(Object.fromEntries(PRECO_HOJE)).toEqual({
        'DS:.10,Bico 04': 7.38,
        'Etanol,Bico 03': 4.98,
        'G,A.Bico 02': 6.98,
        'G,C, Bico 05': 6.98,
        'G,C. Bico 01': 6.98,
        'G,C. Bico 06': 6.98,
    });
});

test('o Bico 06 vende ao preço da gasolina comum em todo dia de janeiro', () => {
    // A lacuna de `valor_lt` do Bico 06 é da fonte (ver `leitura.golden.spec.ts`).
    // O preço implícito `venda_bico / litros` bate com o do Bico 01 em cada dia.
    for (const l of linhas.filter((x) => x.mes === MES && x.bico === BICO_SEM_PRECO_NA_FONTE)) {
        if (l.litros === null || l.venda_bico === null || l.litros === 0) continue;
        expect(Math.abs(l.venda_bico / l.litros - precoDoDia(l))).toBeLessThan(0.005);
    }
});

// ── 1. O vencedor reproduz a planilha (eixo 1: ±1 centavo, e não é float) ─────

for (const d of janeiro) {
    test(`total_vendas pelo encerrante bate com a planilha a 1 centavo — dia ${d.dia}`, () => {
        const vencedor = pelosEncerrantes(MES, d.dia);
        expect(vencedor).not.toBeNull();
        if (vencedor === null) return;

        const residuo = centavos(d.venda_concentrador_total ?? 0) - centavos(vencedor);
        expect(residuo).toBe(RESIDUO_DA_PRECISAO[d.dia - 1] ?? Number.NaN);
        expect(Math.abs(residuo)).toBeLessThanOrEqual(1);
        // O número que vai para `Fechamento.total_vendas` já sai em centavos como
        // DOUBLE — sem `centavos()` no meio, de propósito: é o que pega a soma em
        // float (canário B, 20/09: sem esta linha a mutação passava verde).
        expect(vencedor).toBe(emCentavos(vencedor));
        // A cadeia inteira: o número que `totaisDoDia` grava é este mesmo.
        expect(totaisDoDia(vencedor, []).totalVendas).toBe(vencedor);
    });
}

test('a soma em float derrapa em 10 dias reais de janeiro; o encerrante canônico, em nenhum', () => {
    // Float DELIBERADO: é a mutação que o golden tem de pegar, medida no dado
    // real para provar que a asserção acima não é vazia.
    const derrapam = janeiro.filter((d) => {
        const emFloat = linhasDoDia(MES, d.dia).map(valorGravado).reduce((a, v) => a + v, 0);
        return emFloat !== emCentavos(emFloat);
    });
    expect(derrapam.map((d) => d.dia)).toEqual([6, 10, 13, 14, 19, 20, 22, 25, 27, 29]);
});

test('o resíduo de precisão do mês é −2 centavos, e o float do painel não é a causa', () => {
    expect(RESIDUO_DA_PRECISAO.reduce((a, b) => a + b, 0)).toBe(-2);
    // Ao preço DO DIA, o recálculo em float do painel reproduz a planilha
    // exatamente nos 31 dias — o ±1 vem de `numeric(15,2)`, não do float.
    for (const d of janeiro) {
        expect(centavos(comoOPainel(d.dia, precoDoDia))).toBe(centavos(d.venda_concentrador_total ?? 0));
    }
});

// ── 2. O painel reaberto hoje (eixo 2: o preço) ───────────────────────────────

for (const d of janeiro) {
    test(`painel reaberto hoje soma a mais que o encerrante — dia ${d.dia}`, () => {
        const vencedor = pelosEncerrantes(MES, d.dia) ?? Number.NaN;
        const divergencia = centavos(comoOPainel(d.dia, precoDeHoje)) - centavos(vencedor);
        expect(divergencia).toBe(DIVERGENCIA_POR_DIA[d.dia - 1] ?? Number.NaN);
        expect(divergencia).toBeGreaterThan(0);
    });
}

test('a divergência de janeiro é R$ 23.784,61; pior dia 2 (R$ 1.281,98); menor dia 14 (R$ 431,59)', () => {
    expect(DIVERGENCIA_POR_DIA).toHaveLength(31);
    expect(DIVERGENCIA_POR_DIA.reduce((a, b) => a + b, 0)).toBe(2378461);
    expect(Math.max(...DIVERGENCIA_POR_DIA)).toBe(128198);
    expect(DIVERGENCIA_POR_DIA.indexOf(128198) + 1).toBe(2);
    expect(Math.min(...DIVERGENCIA_POR_DIA)).toBe(43159);
    expect(DIVERGENCIA_POR_DIA.indexOf(43159) + 1).toBe(14);
});

test('reaberto em 1º de fevereiro, a divergência é R$ 2.337,66 e mora toda nos dias 1–6', () => {
    let total = 0;
    for (const d of janeiro) {
        const vencedor = pelosEncerrantes(MES, d.dia) ?? Number.NaN;
        const divergencia = centavos(comoOPainel(d.dia, precoDeFimDeJaneiro)) - centavos(vencedor);
        total += divergencia;
        // Do dia 7 em diante o preço não mudou: sobra só o resíduo de precisão.
        if (d.dia >= 7) expect(divergencia).toBe(RESIDUO_DA_PRECISAO[d.dia - 1] ?? Number.NaN);
        else expect(divergencia).toBeGreaterThan(25000);
    }
    expect(total).toBe(233766);
});

// ── 3. Quem entra na soma (eixo 3) ────────────────────────────────────────────

test('as 6 linhas de litros zero de janeiro vendem R$ 0,00: pulá-las não move o total', () => {
    const zeradas = linhas.filter((l) => l.mes === MES && l.litros === 0);
    expect(zeradas.map((l) => `${l.dia} ${l.bico}`)).toEqual([
        '18 Etanol,Bico 03', '19 Etanol,Bico 03', '20 Etanol,Bico 03',
        '25 G,A.Bico 02', '26 G,A.Bico 02', '27 G,A.Bico 02',
    ]);
    for (const l of zeradas) expect(valorGravado(l)).toBe(0);
});

// ── 4. I8: null é não apurado; 0 é zero informado ─────────────────────────────

test('nos 8 dias incompletos reais de 2026 o encerrante devolve null — nunca 0, nunca o lixo da planilha', () => {
    const incompletos = referencia.filter((d) => d.dado_incompleto !== 0);
    expect(incompletos.map((d) => `${d.mes}/${d.dia}`)).toEqual([
        '2/9', '2/10', '2/11', '2/12', '2/13', '2/14', '2/15', '7/25',
    ]);
    // A coluna da planilha nesses dias: −20 milhões, 0,0 e +20 milhões. O zero
    // do dia 12/02 é exatamente o "0 que quer dizer não apurado" que a I8 proíbe.
    const naPlanilha = new Set(incompletos.map((d) => Math.round(d.venda_concentrador_total ?? Number.NaN)));
    expect(naPlanilha).toEqual(new Set([-20121164, 0, 20178034, -23205523]));

    for (const d of incompletos) {
        expect(pelosEncerrantes(d.mes, d.dia)).toBeNull();
    }
});

test('cinco bicos lidos de seis é dia não apurado, não venda menor', () => {
    const lidas = linhasDoDia(MES, 1).map(valorGravado);
    expect(totalVendasDoEncerrante(lidas, BICOS_ATIVOS)).toBe(9430.34);
    expect(totalVendasDoEncerrante(lidas.slice(1), BICOS_ATIVOS)).toBeNull();
    expect(totalVendasDoEncerrante([], BICOS_ATIVOS)).toBeNull();
});

test('seis bicos lidos com zero litro é ZERO informado, não null', () => {
    expect(totalVendasDoEncerrante([0, 0, 0, 0, 0, 0], BICOS_ATIVOS)).toBe(0);
});
