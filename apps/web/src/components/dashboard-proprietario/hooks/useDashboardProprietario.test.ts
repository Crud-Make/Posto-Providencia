import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    montarResumoDoMes,
    montarResumoDoDia,
    type VendaPeriodo,
} from './useDashboardProprietario';
import { hojeIso } from '../../../utils/periodo';

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

describe('data do período — fuso horário', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * REGRESSÃO DO PAINEL QUE APAGAVA À NOITE (31/07/2026).
     *
     * O hook montava o período com `new Date().toISOString().split('T')[0]`. O posto está
     * em GMT-3, então a partir das 21h locais o UTC já é o dia seguinte. Às 21h de 31/07 a
     * tela consultava 01/08 — e as DUAS abas zeravam, porque `inicioDoMes` derivava do
     * mesmo valor e saltava para o mês novo. Todo dia, das 21h à meia-noite, o painel
     * apagava inteiro.
     */
    it('às 21h de 31/07 em GMT-3, o período ainda é julho — não agosto', () => {
        // 2026-08-01T00:37Z === 2026-07-31 21:37 em GMT-3
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-01T00:37:00.000Z'));

        const hoje = hojeIso();
        const inicioDoMes = `${hoje.slice(0, 7)}-01`;

        // O que o código fazia antes — anotado para deixar o erro visível.
        // eslint-disable-next-line no-restricted-syntax -- reproduz o bug de propósito
        expect(new Date().toISOString().split('T')[0]).toBe('2026-08-01');

        // O que ele faz agora.
        expect(hoje).toBe('2026-07-31');
        expect(inicioDoMes).toBe('2026-07-01');
    });
});

describe('montarResumoDoMes — lucro real do mês', () => {
    /**
     * REGRESSÃO DA DUPLA CONTAGEM (31/07/2026).
     *
     * A tela descontava as despesas de um valor que já vinha líquido delas. Com a
     * tabela `Despesa` vazia o erro valia zero e ninguém viu por meses; assim que
     * julho foi carregado, o resultado exibido caiu de R$ 19.084 para R$ 441 — 97,7%
     * de erro. Este teste garante que a despesa é descontada UMA vez.
     */
    it('desconta a despesa exatamente uma vez', () => {
        const r = montarResumoDoMes(JULHO_ATE_24, DESPESAS_JULHO, 6);

        expect(r.despesas).toBeCloseTo(18_585.76, 2);
        expect(r.lucroReal).toBeCloseTo(JULHO_ATE_24.lucroBruto - 18_585.76, 2);

        // O que a dupla contagem produzia — não pode voltar.
        const duploDesconto = JULHO_ATE_24.lucroBruto - 18_585.76 * 2;
        expect(r.lucroReal).not.toBeCloseTo(duploDesconto, 2);
    });

    it('rateia a despesa por litro', () => {
        const r = montarResumoDoMes(JULHO_ATE_24, DESPESAS_JULHO, 6);
        // 18.585,76 ÷ 31.038,922 = 0,5988 R$/L — o rateio real de julho.
        expect(r.rateioPorLitro).toBeCloseTo(0.5988, 4);
        // Bem acima do fallback chumbado de 0,45 que o código usava sem despesa.
        expect(r.rateioPorLitro).toBeGreaterThan(0.45);
    });

    it('calcula a margem sobre a receita, não sobre o lucro bruto', () => {
        const r = montarResumoDoMes(JULHO_ATE_24, DESPESAS_JULHO, 6);
        expect(r.margemMedia).toBeCloseTo((r.lucroReal / r.vendas) * 100, 6);
    });

    describe('quando não há despesa lançada', () => {
        it('marca temDespesa como false — ausência não é despesa zero', () => {
            const r = montarResumoDoMes(JULHO_ATE_24, [], 6);
            expect(r.temDespesa).toBe(false);
            expect(r.despesas).toBe(0);
            // Sem despesa o lucro real É o bruto; a tela precisa dizer isso ao dono
            // em vez de exibir um número inflado como se fosse resultado.
            expect(r.lucroReal).toBeCloseTo(JULHO_ATE_24.lucroBruto, 2);
            expect(r.rateioPorLitro).toBe(0);
        });

        it('um lançamento de valor zero ainda conta como despesa lançada', () => {
            const r = montarResumoDoMes(JULHO_ATE_24, [0], 6);
            expect(r.temDespesa).toBe(true);
        });
    });

    it('período sem venda não divide por zero', () => {
        const r = montarResumoDoMes({ vendas: 0, litros: 0, lucroBruto: 0 }, [500], 6);
        expect(r.rateioPorLitro).toBe(0);
        expect(r.margemMedia).toBe(0);
        expect(r.lucroReal).toBe(-500); // despesa sem venda é prejuízo
    });
});

describe('montarResumoDoDia — a fatia do dia', () => {
    const UM_DIA: VendaPeriodo = { vendas: 8_000, litros: 1_200, lucroBruto: 1_400 };
    const RATEIO_JULHO = 0.5988;

    it('cobra do dia o rateio do mês vezes os litros do dia', () => {
        const r = montarResumoDoDia(UM_DIA, RATEIO_JULHO, true, 6);
        expect(r.despesas).toBeCloseTo(0.5988 * 1_200, 2); // R$ 718,56
        expect(r.lucroReal).toBeCloseTo(1_400 - 718.56, 2);
    });

    /**
     * REGRESSÃO DO "PREJUÍZO" DE 31/07/2026.
     *
     * As 11 despesas de julho foram lançadas todas em 31/07 (a planilha só dá o mês).
     * Somando as despesas *daquela data*, a aba Hoje mostrava R$ 18.585,76 de despesa
     * contra R$ 0,00 de venda — um prejuízo que nunca existiu — e nos outros 30 dias
     * mostraria despesa zero com lucro inflado.
     */
    it('dia sem venda não herda o mês inteiro de despesa', () => {
        const semVenda: VendaPeriodo = { vendas: 0, litros: 0, lucroBruto: 0 };
        const r = montarResumoDoDia(semVenda, RATEIO_JULHO, true, 6);

        expect(r.despesas).toBe(0);
        expect(r.lucroReal).toBe(0);
        // O que o modelo antigo produzia nesse dia.
        expect(r.lucroReal).not.toBeCloseTo(-18_585.76, 2);
    });

    it('a soma dos dias do mês reconstitui a despesa do mês', () => {
        // Três dias que somam os litros de julho devem somar a despesa de julho.
        const rateio = 18_585.76 / 31_038.922;
        const dias = [10_000, 15_000, 6_038.922];
        const somaDespesas = dias
            .map((litros) => montarResumoDoDia({ vendas: 0, litros, lucroBruto: 0 }, rateio, true, 6))
            .reduce((acc, r) => acc + r.despesas, 0);

        expect(somaDespesas).toBeCloseTo(18_585.76, 2);
    });

    it('sem despesa no mês, o dia não paga rateio', () => {
        const r = montarResumoDoDia(UM_DIA, 0, false, 6);
        expect(r.despesas).toBe(0);
        expect(r.temDespesa).toBe(false);
        expect(r.lucroReal).toBe(1_400);
    });
});
