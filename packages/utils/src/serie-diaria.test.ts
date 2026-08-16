import { describe, it, expect } from 'vitest';
import { serieVendaDiaria, serieEntregas, serieNivelEstoque } from './serie-diaria';

describe('serieVendaDiaria', () => {
    it('soma os bicos do mesmo dia e acumula o mês', () => {
        const s = serieVendaDiaria(
            [
                { dia: 1, litros: 100.5 },
                { dia: 1, litros: 50.25 },
                { dia: 3, litros: 200 },
            ],
            5
        );

        expect(s.pontos[0]).toEqual({ dia: 1, litros: 150.75, acumulado: 150.75 });
        expect(s.pontos[1]).toEqual({ dia: 2, litros: 0, acumulado: 150.75 });
        expect(s.pontos[4].acumulado).toBe(350.75);
        expect(s.total).toBe(350.75);
        expect(s.pico).toBe(200);
    });

    it('divide a média pelos dias COM venda, não pelos dias do mês', () => {
        // Mês em replay: 2 dias lançados de 30. Dividir por 30 devolveria 10 L/dia
        // e pareceria colapso de movimento, quando são 28 dias por lançar.
        const s = serieVendaDiaria([{ dia: 1, litros: 150 }, { dia: 2, litros: 150 }], 30);

        expect(s.diasComVenda).toBe(2);
        expect(s.mediaDiaria).toBe(150);
    });

    it('descarta dia fora da faixa em vez de empilhá-lo no dia 1', () => {
        const s = serieVendaDiaria([{ dia: 0, litros: 999 }, { dia: 40, litros: 999 }], 30);

        expect(s.total).toBe(0);
        expect(s.pontos[0].litros).toBe(0);
    });

    it('devolve zeros, e não NaN, num mês sem venda', () => {
        const s = serieVendaDiaria([], 30);

        expect(s.total).toBe(0);
        expect(s.pico).toBe(0);
        expect(s.mediaDiaria).toBe(0);
    });
});

describe('serieEntregas', () => {
    it('junta as notas do mesmo dia e pondera o preço pelo volume', () => {
        const [entrega] = serieEntregas([
            { dia: 5, litros: 8000, valor: 40000 }, // R$ 5,00/L
            { dia: 5, litros: 2000, valor: 12000 }, // R$ 6,00/L
        ]);

        expect(entrega.litros).toBe(10000);
        expect(entrega.valor).toBe(52000);
        // Ponderado: 5,20. A média das duas médias daria 5,50 — peso igual para
        // uma carga de 8.000 L e uma de 2.000 L.
        expect(entrega.precoLitro).toBe(5.2);
    });

    it('ordena por dia, mesmo com as notas chegando fora de ordem', () => {
        const dias = serieEntregas([
            { dia: 20, litros: 1, valor: 1 },
            { dia: 3, litros: 1, valor: 1 },
        ]).map((e) => e.dia);

        expect(dias).toEqual([3, 20]);
    });
});

describe('serieNivelEstoque', () => {
    it('entra entrega, sai venda, dia a dia', () => {
        const s = serieNivelEstoque(
            1000,
            [{ dia: 1, litros: 100 }, { dia: 2, litros: 100 }],
            [{ dia: 2, litros: 500, valor: 2500 }],
            3
        );

        expect(s.pontos.map((p) => p.nivel)).toEqual([900, 1300, 1300]);
        expect(s.pico).toBe(1300);
        expect(s.nivelFinal).toBe(1300);
    });

    it('conta o estoque de abertura no pico', () => {
        // Mês que só vendeu: o pico é a abertura, não o primeiro dia.
        const s = serieNivelEstoque(5000, [{ dia: 1, litros: 100 }], [], 2);

        expect(s.pico).toBe(5000);
    });
});
