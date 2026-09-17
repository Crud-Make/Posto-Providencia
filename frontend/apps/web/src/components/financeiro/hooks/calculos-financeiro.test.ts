import { describe, it, expect } from 'vitest';
import { resumoFinanceiro } from './calculos-financeiro';

describe('resumoFinanceiro — o card compõe o que já veio calculado', () => {
    it('bruto = receita − custo dos litros; líquido = bruto − despesas', () => {
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 500,
            custoLitrosVendidos: 80_000,
            despesasOps: 5_000,
        });
        expect(r.receitas.total).toBe(100_500);
        expect(r.despesas.total).toBe(85_000);
        expect(r.despesas.compras).toBe(80_000);
        expect(r.lucro.bruto).toBe(20_500);
        expect(r.lucro.liquido).toBe(15_500);
        expect(r.lucro.margem).toBeCloseTo((15_500 / 100_500) * 100, 9);
        // O líquido nunca passa do bruto — era o sintoma do carimbo em zero.
        expect(r.lucro.liquido as number).toBeLessThanOrEqual(r.lucro.bruto as number);
    });

    it('não soma a taxa de cartão duas vezes: lançada, ela já está nas despesas (onda 4.2)', () => {
        // Despesas lançadas 5.000 INCLUEM a fatura da adquirente (450) quando lançada.
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 0,
            custoLitrosVendidos: 10_000,
            despesasOps: 5_000,
        });
        expect(r.despesas.total).toBe(15_000);
        // ANTES (até 28/08/2026): + taxas_pagamento (450) = 15.450.
        expect(r.despesas.total).not.toBe(15_450);
    });

    it('sem custo apurável (produto vendido sem compra) devolve null, nunca lucro inflado', () => {
        const r = resumoFinanceiro({
            receitaVendas: 100_000,
            receitasExtras: 0,
            custoLitrosVendidos: null,
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

    it('falta de caixa NÃO entra na conta — a planilha não desconta (dono, 03/09/2026)', () => {
        // A entrada não tem campo de falta: quem quiser descontar precisa
        // reabrir a decisão, não só passar um número a mais.
        const r = resumoFinanceiro({
            receitaVendas: 290_062.94,
            receitasExtras: 0,
            custoLitrosVendidos: 241_267.16,
            despesasOps: 22_158.46,
        });
        // Janeiro/2026 com a despesa da planilha: fecha com o J11 dela (25.337,92)
        // a menos do preço — a planilha usa 6,38 fixo, o card o preço do dia.
        expect(r.lucro.liquido).toBe(26_637.32);
    });

    it('quantiza em centavos na saída', () => {
        const r = resumoFinanceiro({
            receitaVendas: 0.1,
            receitasExtras: 0.2,
            custoLitrosVendidos: 0.1,
            despesasOps: 0,
        });
        expect(r.receitas.total).toBe(0.3);
        expect(r.lucro.bruto).toBe(0.2);
    });
});
