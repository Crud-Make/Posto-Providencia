import { describe, it, expect } from 'vitest';
import { despesasDoPeriodo } from './calculos-financeiro';

describe('despesasDoPeriodo — taxa de cartão é despesa do mês (onda 4.2)', () => {
    it('não soma o carimbo taxas_pagamento: a taxa lançada já está nas despesas', () => {
        // Cenário com carimbo: custo 10.000, faltas 300, despesas lançadas
        // 5.000 (que INCLUEM a fatura da adquirente quando lançada).
        const resumo = { custo_combustiveis: 10_000, faltas: 300 };
        const total = despesasDoPeriodo(resumo, 5_000, 0);

        expect(total).toBe(15_300);

        // ANTES (até 28/08/2026): + taxas_pagamento (ex.: 450) = 15.750 —
        // a taxa saía duas vezes do lucro nos meses em que estava lançada.
        expect(total).not.toBe(15_750);
    });

    it('sem carimbo, cai no somatório direto: despesas lançadas + compras', () => {
        expect(despesasDoPeriodo(null, 5_000, 80_000)).toBe(85_000);
    });
});
