import { describe, it, expect } from 'vitest';
import { resumoFinanceiro, totalFaltas } from './calculos-financeiro';

describe('resumoFinanceiro — o card compõe o que já veio calculado', () => {
    it('bruto = receita − custo dos litros; líquido = bruto − faltas − despesas', () => {
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 500,
            custoLitrosVendidos: 80_000,
            faltas: 300,
            despesasOps: 5_000,
        });
        expect(r.receitas.total).toBe(100_500);
        expect(r.despesas.total).toBe(85_300);
        expect(r.despesas.compras).toBe(80_000);
        expect(r.lucro.bruto).toBe(20_500);
        expect(r.lucro.liquido).toBe(15_200);
        expect(r.lucro.margem).toBeCloseTo((15_200 / 100_500) * 100, 9);
        // O líquido nunca passa do bruto — era o sintoma do carimbo em zero.
        expect(r.lucro.liquido as number).toBeLessThanOrEqual(r.lucro.bruto as number);
    });

    it('não soma a taxa de cartão duas vezes: lançada, ela já está nas despesas (onda 4.2)', () => {
        // Despesas lançadas 5.000 INCLUEM a fatura da adquirente (450) quando lançada.
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 0,
            custoLitrosVendidos: 10_000,
            faltas: 300,
            despesasOps: 5_000,
        });
        expect(r.despesas.total).toBe(15_300);
        // ANTES (até 28/08/2026): + taxas_pagamento (450) = 15.750.
        expect(r.despesas.total).not.toBe(15_750);
    });

    it('sem custo apurável (produto vendido sem compra) devolve null, nunca lucro inflado', () => {
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 0,
            custoLitrosVendidos: null,
            faltas: 0,
            despesasOps: 5_000,
        });
        expect(r.receitas.total).toBe(100_000);
        expect(r.despesas.operacionais).toBe(5_000);
        expect(r.despesas.total).toBeNull();
        expect(r.despesas.compras).toBeNull();
        expect(r.lucro.bruto).toBeNull();
        expect(r.lucro.liquido).toBeNull();
        expect(r.lucro.margem).toBeNull();
    });

    it('quantiza em centavos na saída', () => {
        const r = resumoFinanceiro({
            receitaVendas: 0.1,
            receitasExtras: 0.2,
            custoLitrosVendidos: 0.1,
            faltas: 0,
            despesasOps: 0,
        });
        expect(r.receitas.total).toBe(0.3);
        expect(r.lucro.bruto).toBe(0.2);
    });
});

describe('totalFaltas — positivo é FALTA, negativo é SOBRA (§6)', () => {
    it('soma só as diferenças positivas', () => {
        // 31/01: falta 100 · 01/02: sobra 40 · 02/02: falta 10,5
        expect(totalFaltas([100, -40, 10.5])).toBe(110.5);
    });

    it('sobra não vira prejuízo (antes: Math.abs contava −308,52 como falta)', () => {
        expect(totalFaltas([-308.52])).toBe(0);
    });

    it('sem fechamento no período é zero', () => {
        expect(totalFaltas([])).toBe(0);
    });
});
