import { describe, it, expect } from 'vitest';
import { montarResumo, type VendaPeriodo } from './useDashboardProprietario';

/**
 * Julho/2026 em produção, conferido contra o golden `lucro-real.golden.spec.ts`.
 * Números reais, não inventados — recortados até o dia 24, que é onde o ETL para.
 */
const JULHO_ATE_24: VendaPeriodo = {
    vendas: 207_897.83,
    litros: 31_038.922,
    lucroBruto: 36_858.09, // receita − custo de compra, antes das despesas
};

const DESPESAS_JULHO = [
    4315.76, 3500, 1658, 1650, 1644, 1626, 1500, 1217, 1095, 280, 100,
]; // 11 lançamentos = R$ 18.585,76

describe('montarResumo — lucro real do período', () => {
    /**
     * REGRESSÃO DA DUPLA CONTAGEM (31/07/2026).
     *
     * A tela descontava as despesas de um valor que já vinha líquido delas. Com a
     * tabela `Despesa` vazia o erro valia zero e ninguém viu por meses; assim que
     * julho foi carregado, o resultado exibido caiu de R$ 19.084 para R$ 441 — 97,7%
     * de erro. Este teste garante que a despesa é descontada UMA vez.
     */
    it('desconta a despesa exatamente uma vez', () => {
        const r = montarResumo(JULHO_ATE_24, DESPESAS_JULHO, 6);

        expect(r.despesas).toBeCloseTo(18_585.76, 2);
        expect(r.lucroReal).toBeCloseTo(JULHO_ATE_24.lucroBruto - 18_585.76, 2);

        // O que a dupla contagem produzia — não pode voltar.
        const duploDesconto = JULHO_ATE_24.lucroBruto - 18_585.76 * 2;
        expect(r.lucroReal).not.toBeCloseTo(duploDesconto, 2);
    });

    it('rateia a despesa por litro', () => {
        const r = montarResumo(JULHO_ATE_24, DESPESAS_JULHO, 6);
        // 18.585,76 ÷ 31.038,922 = 0,5988 R$/L — o rateio real de julho.
        expect(r.rateioPorLitro).toBeCloseTo(0.5988, 4);
        // Bem acima do fallback chumbado de 0,45 que o código usava sem despesa.
        expect(r.rateioPorLitro).toBeGreaterThan(0.45);
    });

    it('calcula a margem sobre a receita, não sobre o lucro bruto', () => {
        const r = montarResumo(JULHO_ATE_24, DESPESAS_JULHO, 6);
        expect(r.margemMedia).toBeCloseTo((r.lucroReal / r.vendas) * 100, 6);
    });

    describe('quando não há despesa lançada', () => {
        it('marca temDespesa como false — ausência não é despesa zero', () => {
            const r = montarResumo(JULHO_ATE_24, [], 6);
            expect(r.temDespesa).toBe(false);
            expect(r.despesas).toBe(0);
            // Sem despesa o lucro real É o bruto; a tela precisa dizer isso ao dono
            // em vez de exibir um número inflado como se fosse resultado.
            expect(r.lucroReal).toBeCloseTo(JULHO_ATE_24.lucroBruto, 2);
            expect(r.rateioPorLitro).toBe(0);
        });

        it('um lançamento de valor zero ainda conta como despesa lançada', () => {
            const r = montarResumo(JULHO_ATE_24, [0], 6);
            expect(r.temDespesa).toBe(true);
        });
    });

    it('período sem venda não divide por zero', () => {
        const r = montarResumo({ vendas: 0, litros: 0, lucroBruto: 0 }, [500], 6);
        expect(r.rateioPorLitro).toBe(0);
        expect(r.margemMedia).toBe(0);
        expect(r.lucroReal).toBe(-500); // despesa sem venda é prejuízo
    });
});
