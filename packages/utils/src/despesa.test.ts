import { describe, it, expect } from 'vitest';
import { ehLinhaDeTotal, somarDespesas, ROTULOS_DE_TOTAL } from './despesa';

describe('ehLinhaDeTotal', () => {
    it('reconhece os rótulos que a planilha usa para total', () => {
        for (const rotulo of ROTULOS_DE_TOTAL) {
            expect(ehLinhaDeTotal(rotulo)).toBe(true);
        }
    });

    it('ignora caixa e espaço nas pontas — a planilha é digitada à mão', () => {
        expect(ehLinhaDeTotal('  Total.  ')).toBe(true);
        expect(ehLinhaDeTotal('TOTAL')).toBe(true);
        expect(ehLinhaDeTotal('total.')).toBe(true);
    });

    it('não confunde categoria de verdade com a linha de total', () => {
        // Nenhuma destas pode ser descartada: são despesas reais da planilha.
        for (const cat of ['Frete', 'Luz', 'FGTS.', 'Contador', 'Despesa extras', 'Total Geral']) {
            expect(ehLinhaDeTotal(cat)).toBe(false);
        }
    });

    it('trata nulo e vazio como não-total', () => {
        expect(ehLinhaDeTotal(null)).toBe(false);
        expect(ehLinhaDeTotal(undefined)).toBe(false);
        expect(ehLinhaDeTotal('')).toBe(false);
    });
});

describe('somarDespesas — a armadilha do dobro', () => {
    /**
     * Regressão do achado de 31/07/2026: somar a coluna crua de
     * `despesa_categoria_mensal` devolvia exatamente o dobro (R$ 280.912,54 em vez de
     * R$ 140.456,27), porque a linha de total da planilha vem junto com as de detalhe.
     */
    it('descarta a linha de total em vez de somar o dobro', () => {
        const linhas = [
            { categoria: 'Frete', valor: 5640 },
            { categoria: 'Luz', valor: 650 },
            { categoria: 'Total.', valor: 6290 },
        ];
        expect(somarDespesas(linhas)).toBe(6290);

        // O que aconteceria sem o filtro — exatamente o dobro, o que passa por plausível.
        const somaCrua = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
        expect(somaCrua).toBe(12580);
        expect(somaCrua).toBe(somarDespesas(linhas) * 2);
    });

    it('descarta também o sentinela __TOTAL__ da aba trimestral', () => {
        expect(somarDespesas([
            { categoria: 'Bonbeiro AVCB', valor: 3418 },
            { categoria: '__TOTAL__', valor: 3418 },
        ])).toBe(3418);
    });

    it('célula vazia da planilha conta como zero, não quebra a soma', () => {
        expect(somarDespesas([
            { categoria: 'Eco Valle', valor: null },
            { categoria: 'Frete', valor: 5640 },
        ])).toBe(5640);
    });

    it('lista vazia soma zero', () => {
        expect(somarDespesas([])).toBe(0);
    });
});
