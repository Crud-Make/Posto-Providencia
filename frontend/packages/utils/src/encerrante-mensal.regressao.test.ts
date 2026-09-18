/**
 * Regressão de fórmula — `encerrante-mensal.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * O golden master (`encerrante-mensal.golden.spec.ts`) continua sendo quem prova
 * que o módulo bate com os meses reais da planilha; ele lê `docs/data/` e só roda
 * na máquina do dono. Esta suíte prova outra coisa e roda no CI: que o
 * comportamento NÃO MUDOU.
 *
 * Entradas inventadas — encerrante 10.000 → 13.000, R$ 6,00/L, bicos chamados
 * "Bico 01" e "Bico 02". Nenhum número, data ou rótulo vem do posto real.
 *
 * As decisões de domínio travadas aqui:
 * - o mês fecha no ÚLTIMO DIA FECHADO, e Dia Parcial (inicial sem fechamento)
 *   fica de fora;
 * - Litros em Lacuna = salto do encerrante − soma dos dias lançados;
 * - o mês inteiro só está fechado até onde o bico mais atrasado está fechado.
 */
import { describe, it, expect } from 'vitest';
import {
    encerranteMensalDoBico,
    encerranteMensal,
    type LeituraDiariaBico,
} from './encerrante-mensal';

const leitura = (
    dia: number,
    bico: string,
    inicial: number | null,
    fechamento: number | null,
    valorDia: number | null
): LeituraDiariaBico => ({ dia, bico, inicial, fechamento, valorDia });

/** Três dias cheios do Bico 01: 1000 L/dia, R$ 6,00 nos dois primeiros e R$ 6,30 no terceiro. */
const TRES_DIAS: LeituraDiariaBico[] = [
    leitura(1, 'Bico 01', 10000, 11000, 6000),
    leitura(2, 'Bico 01', 11000, 12000, 6000),
    leitura(3, 'Bico 01', 12000, 13000, 6300),
];

const BICO_VAZIO_SEM_NOME = {
    bico: '',
    primeiroDia: null,
    ultimoDiaFechado: null,
    inicial: null,
    fechamento: null,
    litros: 0,
    litrosLancados: 0,
    litrosEmLacuna: 0,
    bruto: 0,
    precoMedio: null,
    diasLancados: 0,
    diasEmLacuna: [],
};

describe('encerranteMensalDoBico — o acumulado de um bico', () => {
    it('sem leitura nenhuma devolve o bico vazio, com o rótulo em branco', () => {
        expect(encerranteMensalDoBico([])).toEqual(BICO_VAZIO_SEM_NOME);
    });

    it('mês cheio: o salto é o acumulado e não sobra lacuna', () => {
        expect(encerranteMensalDoBico(TRES_DIAS)).toEqual({
            bico: 'Bico 01',
            primeiroDia: 1,
            ultimoDiaFechado: 3,
            inicial: 10000,
            fechamento: 13000,
            litros: 3000,
            litrosLancados: 3000,
            litrosEmLacuna: 0,
            bruto: 18300,
            // R$ 18.300,00 ÷ 3000 L — ponderado dos dias, não o preço de um dia.
            precoMedio: 6.1,
            diasLancados: 3,
            diasEmLacuna: [],
        });
    });

    it('a ordem de entrada não importa', () => {
        const desordenado = [TRES_DIAS[2], TRES_DIAS[0], TRES_DIAS[1]];
        expect(encerranteMensalDoBico(desordenado)).toEqual(encerranteMensalDoBico(TRES_DIAS));
    });

    it('Dia Parcial no fim NÃO fecha o mês — é o bug da planilha', () => {
        // O dia 4 tem inicial e não tem fechamento: o mês continua fechando no
        // dia 3, com os mesmos 3000 L. Usar o dia 4 produziria o litro negativo.
        const comParcial = [...TRES_DIAS, leitura(4, 'Bico 01', 13000, null, null)];
        expect(encerranteMensalDoBico(comParcial)).toEqual(encerranteMensalDoBico(TRES_DIAS));
    });

    it('dia que nem linha tem vira Litros em Lacuna', () => {
        const comBuraco = [TRES_DIAS[0], TRES_DIAS[2]];
        expect(encerranteMensalDoBico(comBuraco)).toEqual({
            bico: 'Bico 01',
            primeiroDia: 1,
            ultimoDiaFechado: 3,
            inicial: 10000,
            fechamento: 13000,
            litros: 3000,
            litrosLancados: 2000,
            litrosEmLacuna: 1000,
            bruto: 12300, // R$ 6.000,00 do dia 1 + R$ 6.300,00 do dia 3
            precoMedio: 6.15,
            diasLancados: 2,
            diasEmLacuna: [2],
        });
    });

    it('dia presente-mas-furado conta como lacuna igualzinho ao dia ausente', () => {
        const furado = [
            TRES_DIAS[0],
            leitura(2, 'Bico 01', 11000, null, null),
            TRES_DIAS[2],
        ];
        expect(encerranteMensalDoBico(furado)).toEqual(
            encerranteMensalDoBico([TRES_DIAS[0], TRES_DIAS[2]])
        );
    });

    it('bico sem nenhum fechamento devolve vazio, mas guardando o rótulo', () => {
        expect(encerranteMensalDoBico([leitura(1, 'Bico 01', 10000, null, null)])).toEqual({
            ...BICO_VAZIO_SEM_NOME,
            bico: 'Bico 01',
        });
    });

    it('bico sem nenhum inicial devolve vazio', () => {
        expect(encerranteMensalDoBico([leitura(1, 'Bico 01', null, 11000, 6000)])).toEqual({
            ...BICO_VAZIO_SEM_NOME,
            bico: 'Bico 01',
        });
    });

    it('fechamento anterior à abertura devolve vazio em vez de salto negativo', () => {
        const invertido = [
            leitura(1, 'Bico 01', null, 11000, 100),
            leitura(2, 'Bico 01', 12000, null, null),
        ];
        expect(encerranteMensalDoBico(invertido)).toEqual({
            ...BICO_VAZIO_SEM_NOME,
            bico: 'Bico 01',
        });
    });

    it('encerrante NaN é tratado como não lançado', () => {
        const comNaN = [
            leitura(1, 'Bico 01', NaN, 11000, 100),
            leitura(2, 'Bico 01', 11000, 12000, 600),
        ];
        const r = encerranteMensalDoBico(comNaN);
        expect(r.primeiroDia).toBe(2);
        expect(r.inicial).toBe(11000);
        expect(r.litros).toBe(1000);
        expect(r.diasLancados).toBe(1);
    });

    it('dia sem preço soma zero no bruto e derruba o preço médio para 0, não para null', () => {
        // Congelado como está: `litrosLancados > 0` com bruto zerado devolve 0.
        expect(encerranteMensalDoBico([leitura(1, 'Bico 01', 10000, 11000, null)])).toEqual({
            bico: 'Bico 01',
            primeiroDia: 1,
            ultimoDiaFechado: 1,
            inicial: 10000,
            fechamento: 11000,
            litros: 1000,
            litrosLancados: 1000,
            litrosEmLacuna: 0,
            bruto: 0,
            precoMedio: 0,
            diasLancados: 1,
            diasEmLacuna: [],
        });
    });

    it('dia lançado com encerrante parado: preço médio null, mas o dia conta', () => {
        expect(encerranteMensalDoBico([leitura(1, 'Bico 01', 10000, 10000, 0)])).toEqual({
            bico: 'Bico 01',
            primeiroDia: 1,
            ultimoDiaFechado: 1,
            inicial: 10000,
            fechamento: 10000,
            litros: 0,
            litrosLancados: 0,
            litrosEmLacuna: 0,
            bruto: 0,
            precoMedio: null,
            diasLancados: 1,
            diasEmLacuna: [],
        });
    });

    it('escala em mililitro e centavo: 1000,75 L e R$ 1,005 caindo para R$ 1,00', () => {
        const r = encerranteMensalDoBico([leitura(1, 'Bico 01', 1000.125, 2000.875, 1.005)]);
        expect(r.litros).toBe(1000.75);
        expect(r.litrosLancados).toBe(1000.75);
        // Math.round(1.005 * 100) === 100 porque o float de 1,005 é 1.00499...
        expect(r.bruto).toBe(1);
    });
});

describe('encerranteMensal — o mês somando todos os bicos', () => {
    it('sem leitura nenhuma devolve o mês vazio', () => {
        expect(encerranteMensal([])).toEqual({
            bicos: [],
            ultimoDiaFechado: null,
            litros: 0,
            litrosLancados: 0,
            litrosEmLacuna: 0,
            bruto: 0,
            precoMedio: null,
            temLacuna: false,
        });
    });

    it('ordena os bicos e fecha o mês no bico mais atrasado', () => {
        const mes = encerranteMensal([
            leitura(1, 'Bico 02', 20000, 20500, 3000),
            leitura(2, 'Bico 02', 20500, 21000, 3000),
            ...TRES_DIAS.map((l) => ({ ...l, valorDia: 6000 })),
        ]);
        expect(mes.bicos.map((b) => b.bico)).toEqual(['Bico 01', 'Bico 02']);
        // Bico 01 fecha no dia 3, Bico 02 no dia 2 — o mês fecha no dia 2.
        expect(mes.ultimoDiaFechado).toBe(2);
        expect(mes.litros).toBe(4000);
        expect(mes.litrosLancados).toBe(4000);
        expect(mes.litrosEmLacuna).toBe(0);
        expect(mes.bruto).toBe(24000);
        expect(mes.precoMedio).toBe(6);
        expect(mes.temLacuna).toBe(false);
    });

    it('um bico sem fechamento deixa o mês SEM último dia fechado', () => {
        const mes = encerranteMensal([
            leitura(1, 'Bico 01', 10000, 11000, 6000),
            leitura(1, 'Bico 02', 20000, null, null),
        ]);
        expect(mes.ultimoDiaFechado).toBe(null);
        expect(mes.litros).toBe(1000);
        expect(mes.bruto).toBe(6000);
        expect(mes.bicos).toHaveLength(2);
        expect(mes.bicos[1].ultimoDiaFechado).toBe(null);
    });

    it('lacuna de um bico levanta a flag do mês inteiro', () => {
        const mes = encerranteMensal([TRES_DIAS[0], TRES_DIAS[2]]);
        expect(mes.temLacuna).toBe(true);
        expect(mes.litros).toBe(3000);
        expect(mes.litrosLancados).toBe(2000);
        expect(mes.litrosEmLacuna).toBe(1000);
        expect(mes.bruto).toBe(12300);
        expect(mes.precoMedio).toBe(6.15);
    });
});
