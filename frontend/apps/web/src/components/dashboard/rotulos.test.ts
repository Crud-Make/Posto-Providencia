import { describe, expect, it } from 'vitest';
import { legendaDoLucro, rotuloDaJanelaDoRateio } from './rotulos';

const JANEIRO = { inicio: '2026-01-01', fim: '2026-01-31' };
const JAN_FEV = { inicio: '2026-01-01', fim: '2026-02-28' };
const DEZ_JAN = { inicio: '2025-12-01', fim: '2026-01-31' };

describe('rotuloDaJanelaDoRateio', () => {
    it('sem janela (caminho Supabase antigo, sem kpis.janelaDoRateio) não rotula', () => {
        expect(rotuloDaJanelaDoRateio(undefined)).toBeNull();
    });

    it('mês único não rotula — a legenda de sempre basta', () => {
        expect(rotuloDaJanelaDoRateio(JANEIRO)).toBeNull();
    });

    it('meses no mesmo ano: um ano só, no fim', () => {
        expect(rotuloDaJanelaDoRateio(JAN_FEV)).toBe('jan–fev/2026');
    });

    it('meses em anos diferentes (dez–jan): cada mês com o seu ano', () => {
        expect(rotuloDaJanelaDoRateio(DEZ_JAN)).toBe('dez/2025–jan/2026');
    });

    it('lê a data como local, não UTC: o dia 1 não escorrega para o mês anterior', () => {
        // Regressão da memória `timestamps-leitura-em-utc`: `new Date('2026-02-01')` em
        // America/Sao_Paulo cai em 31/01 e o rótulo viraria `jan–jan`, que é `null`.
        expect(rotuloDaJanelaDoRateio({ inicio: '2026-02-01', fim: '2026-03-31' })).toBe('fev–mar/2026');
    });
});

describe('legendaDoLucro', () => {
    describe('todos os produtos vendidos têm compra', () => {
        it('mês único: legenda de sempre', () => {
            expect(legendaDoLucro([], JANEIRO)).toBe('Custo da compra do mês');
            expect(legendaDoLucro(undefined, undefined)).toBe('Custo da compra do mês');
        });

        it('meses no mesmo ano: diz de onde veio custo e despesa', () => {
            expect(legendaDoLucro([], JAN_FEV)).toBe('Custo e despesa de jan–fev/2026');
        });

        it('meses em anos diferentes', () => {
            expect(legendaDoLucro([], DEZ_JAN)).toBe('Custo e despesa de dez/2025–jan/2026');
        });
    });

    describe('há produto vendido sem compra (totalProfit null)', () => {
        it('mês único: nomeia o produto e diz "no mês"', () => {
            expect(legendaDoLucro(['Etanol'], JANEIRO)).toBe('sem compra de Etanol no mês');
            expect(legendaDoLucro(['Etanol'], undefined)).toBe('sem compra de Etanol no mês');
        });

        it('mais de um produto: lista separada por vírgula', () => {
            expect(legendaDoLucro(['Etanol', 'Diesel S10'], JANEIRO)).toBe('sem compra de Etanol, Diesel S10 no mês');
        });

        it('meses no mesmo ano: nomeia o produto e a janela', () => {
            expect(legendaDoLucro(['Etanol'], JAN_FEV)).toBe('sem compra de Etanol em jan–fev/2026');
        });

        it('meses em anos diferentes: nomeia o produto e a janela com os dois anos', () => {
            expect(legendaDoLucro(['Etanol'], DEZ_JAN)).toBe('sem compra de Etanol em dez/2025–jan/2026');
        });
    });
});
