/**
 * Golden do `calcularTotais` REAL do painel contra o encerrante — o outro lado
 * de `packages/utils/src/total-vendas-encerrante.golden.spec.ts` (fatia P8).
 *
 * @remarks
 * O golden do pacote mede a divergência usando uma RÉPLICA das regras deste
 * módulo (recalcula `litros × preço`, acumula em float, pula a linha de litros
 * zero). Réplica pode mentir. Este arquivo chama a função de verdade, com os
 * mesmos tipos de UI e as mesmas strings BR que a tela manda, e exige que ela
 * devolva exatamente os centavos que o pacote travou — dia a dia.
 *
 * O que fica provado sobre o painel, nos 31 dias reais de janeiro/2026:
 *   - ao preço DO DIA, ele reproduz a planilha ao centavo (o float não custa nada);
 *   - ao preço de HOJE (`bico.combustivel.preco_venda`, que é o que ele usa),
 *     soma R$ 23.784,61 A MAIS que o encerrante no mês, pior dia 2 (R$ 1.281,98).
 *
 * Decisão do dono (20/09/2026, §7 d): vale o encerrante. O painel não foi
 * alterado aqui — este golden é o que tem de continuar verde ANTES e DEPOIS de
 * cada troca de call site (Design Doc, Testes › P8).
 *
 * Roda sob `bun run test:golden`; o vitest ignora (`*.spec.ts`).
 */
import { Database } from 'bun:sqlite';
import { test, expect } from 'bun:test';
import { emCentavos, totalVendasDoEncerrante } from '@posto/utils';
import type { BicoComDetalhes } from '../types/fechamento';
import { calcularTotais } from './calculators';
import { analisarValor, formatarParaBR } from './formatters';

const DB_PATH = `${import.meta.dir}/../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(DB_PATH, { readonly: true });

const ANO = 2026;
const MES = 1;
const BICOS_ATIVOS = 6;

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

/** Os mesmos centavos travados em `total-vendas-encerrante.golden.spec.ts`. */
const DIVERGENCIA_POR_DIA: readonly number[] = [
    107350, 128198, 113519, 111656, 108621, 95303, 67541, 68467, 58373, 59632, 62602,
    93273, 77916, 43159, 61539, 85399, 57991, 71836, 116920, 87051, 65765, 58636,
    52633, 67500, 45234, 89144, 51778, 82325, 50540, 76343, 62217,
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

const vencedor = (dia: number): number =>
    totalVendasDoEncerrante(linhasDoDia(dia).map((l) => emCentavos(l.venda_bico)), BICOS_ATIVOS) ?? Number.NaN;

test('a string BR da tela volta ao mesmo encerrante (o parser não é o eixo da divergência)', () => {
    expect(analisarValor(formatarParaBR(1716778.963, 3))).toBe(1716778.963);
    expect(analisarValor(formatarParaBR(4566.411, 3))).toBe(4566.411);
});

for (const p of planilha) {
    test(`ao preço do dia, calcularTotais reproduz a planilha ao centavo — dia ${p.dia}`, () => {
        const totais = calcularTotais(bicosDoDia(p.dia, precoDoDia), leiturasDoDia(p.dia));
        expect(centavos(totais.valor)).toBe(centavos(p.venda_concentrador_total));
        const litros = linhasDoDia(p.dia).reduce((a, l) => a + l.litros, 0);
        expect(Math.abs(totais.litros - litros)).toBeLessThan(0.002);
    });

    test(`ao preço de hoje, calcularTotais diverge do encerrante pelo valor travado — dia ${p.dia}`, () => {
        const totais = calcularTotais(bicosDoDia(p.dia, (l) => PRECO_HOJE[l.bico] ?? 0), leiturasDoDia(p.dia));
        expect(centavos(totais.valor) - centavos(vencedor(p.dia))).toBe(DIVERGENCIA_POR_DIA[p.dia - 1] ?? Number.NaN);
    });
}

test('a divergência real do painel em janeiro é R$ 23.784,61, pior dia 2 (R$ 1.281,98)', () => {
    const total = planilha.reduce((acc, p) => {
        const totais = calcularTotais(bicosDoDia(p.dia, (l) => PRECO_HOJE[l.bico] ?? 0), leiturasDoDia(p.dia));
        return acc + centavos(totais.valor) - centavos(vencedor(p.dia));
    }, 0);
    expect(total).toBe(2378461);
    expect(Math.max(...DIVERGENCIA_POR_DIA)).toBe(128198);
});

test('pular a linha de litros zero (regra do "-") não move o total: são 6 linhas e valem R$ 0,00', () => {
    const zeradas = linhas.filter((l) => l.litros === 0);
    expect(zeradas).toHaveLength(6);
    for (const z of zeradas) {
        const comTodas = calcularTotais(bicosDoDia(z.dia, precoDoDia), leiturasDoDia(z.dia));
        const semAZerada = calcularTotais(
            bicosDoDia(z.dia, precoDoDia).filter((b) => b.combustivel.nome !== z.bico),
            leiturasDoDia(z.dia)
        );
        expect(comTodas.valor).toBe(semAZerada.valor);
        expect(comTodas.litros).toBe(semAZerada.litros);
    }
});
