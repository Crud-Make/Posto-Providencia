/**
 * Golden master de UMA leitura de bico contra as 1.188 leituras reais de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`, tabela `encerrante_diario`
 * (extração crua da planilha, estágio 1 do ETL). Roda sob `bun test`; vitest
 * ignora (`*.spec.ts`).
 *
 * A tabela guarda, na mesma linha, a ENTRADA e o RESULTADO que a planilha
 * apurou — `inicial`, `fechamento`, `litros`, `valor_lt`, `venda_bico`. Por
 * isso a conferência aqui não é circular: a função recebe as duas leituras e o
 * preço, e tem de reproduzir os litros e o faturamento que o posto viveu.
 *
 * Existe para permitir a consolidação das duas implementações antigas
 * (`api.ts` do PWA e `leitura.service.ts` do painel) com prova, e não com
 * confiança — §7 do CLAUDE.md: nunca consolidar duplicata sem teste rodando
 * contra todas elas.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { litrosVendidos, valorDaLeitura, motivoImplausivel } from './leitura';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Litros são exatos ao mililitro; a folga cobre só ruído de float da fonte. */
const TOL_LITROS = 0.002;
/** Um centavo de folga por linha — a planilha arredonda na exibição. */
const TOL_REAIS = 0.01;

interface LinhaDiaria {
    mes: number;
    dia: number;
    bico: string;
    inicial: number;
    fechamento: number;
    litros: number;
    /** Nulo em todas as linhas do Bico 06 — ver a lacuna conhecida no bloco 2. */
    valor_lt: number | null;
    venda_bico: number;
}

const LINHAS = db
    .query<LinhaDiaria, []>(
        `SELECT mes, dia, bico, inicial, fechamento, litros, valor_lt, venda_bico
           FROM encerrante_diario
          WHERE inicial IS NOT NULL
            AND fechamento IS NOT NULL
            AND litros IS NOT NULL
          ORDER BY mes, dia, bico`
    )
    .all();

test('a fonte tem as 1.188 leituras completas de 2026', () => {
    expect(LINHAS.length).toBe(1188);
});

// ── 1. Litros: a função reproduz a coluna da planilha, linha a linha ───────────

for (const l of LINHAS) {
    test(`${String(l.mes).padStart(2, '0')}/${String(l.dia).padStart(2, '0')} · ${l.bico} · litros`, () => {
        const obtido = litrosVendidos({ inicial: l.inicial, fechamento: l.fechamento });
        expect(Math.abs(obtido - l.litros)).toBeLessThan(TOL_LITROS);
    });
}

// ── 2. Faturamento: litros × preço do dia reproduz `venda_bico` ────────────────
//
// ⚠️ LACUNA CONHECIDA DA FONTE, não da função: o `Bico 06` sai do ETL com
// `valor_lt` NULO em TODAS as suas 198 linhas, embora tenha `litros` e
// `venda_bico`. Sem preço não há multiplicação para conferir, então essas
// linhas ficam fora deste bloco — e o teste logo abaixo trava o tamanho da
// lacuna, para ela não crescer em silêncio nem ser "resolvida" apagando casos.
// O preço do Bico 06 é recuperável da própria fonte (`venda_bico / litros`);
// corrigir isso é trabalho do ETL, não deste módulo.

const COM_PRECO = LINHAS.filter(l => l.valor_lt !== null);
const SEM_PRECO = LINHAS.filter(l => l.valor_lt === null);

test('a lacuna de preço da fonte é exatamente o Bico 06, com 198 linhas', () => {
    expect(SEM_PRECO).toHaveLength(198);
    expect(new Set(SEM_PRECO.map(l => l.bico))).toEqual(new Set(['G,C. Bico 06']));
    expect(COM_PRECO).toHaveLength(990);
});

for (const l of COM_PRECO) {
    test(`${String(l.mes).padStart(2, '0')}/${String(l.dia).padStart(2, '0')} · ${l.bico} · venda`, () => {
        const obtido = valorDaLeitura({ inicial: l.inicial, fechamento: l.fechamento }, l.valor_lt as number);
        expect(Math.abs(obtido - l.venda_bico)).toBeLessThan(TOL_REAIS);
    });
}

// ── 3. O piso de zero é inerte no histórico ───────────────────────────────────
// É a prova de que trocar a implementação do painel (que não tinha piso) pela
// canônica NÃO altera nenhum número já apurado: em 2026 a bomba nunca andou
// para trás, então `Math.max(0, …)` nunca chega a agir.

test('nenhuma das 1.188 leituras reais tem o encerrante retrocedendo', () => {
    const retrocederam = LINHAS.filter(l => l.fechamento < l.inicial);
    expect(retrocederam).toHaveLength(0);
});

test('o piso de zero não altera nenhum litro do histórico', () => {
    for (const l of LINHAS) {
        const comPiso = litrosVendidos({ inicial: l.inicial, fechamento: l.fechamento });
        const semPiso = l.fechamento - l.inicial;
        expect(comPiso).toBe(semPiso);
    }
});

// ── 4. O teto de plausibilidade contra a operação real ────────────────────────
// Não é um limite inventado: serve para saber quantos dias reais ele acusaria
// se estivesse ligado na gravação. Se este número crescer sozinho, o teto está
// errado para a operação — e é melhor descobrir aqui do que travando o dono.

test('o teto de 3000 L acusa apenas os dias de movimento realmente atípico', () => {
    const acimaDoTeto = LINHAS.filter(l => motivoImplausivel(l) === 'acima-do-teto');
    const nomes = acimaDoTeto.map(l => `${l.mes}/${l.dia} ${l.bico} = ${l.litros.toFixed(3)} L`);
    console.log(`\nLeituras acima do teto de 3000 L: ${acimaDoTeto.length} de ${LINHAS.length}`);
    for (const n of nomes) console.log(`  ${n}`);
    expect(acimaDoTeto.length).toBeLessThan(LINHAS.length * 0.02);
});
