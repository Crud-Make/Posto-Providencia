/**
 * Regressão de fórmula — `serie-diaria.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Não substitui golden master: aqui se congela o comportamento, não a
 * correspondência com a planilha. Entradas inventadas (1000 L num dia, entregas
 * de R$ 10.000,00, ano 2000), saídas escritas à mão a partir da execução real.
 * Nenhum número vem do posto real.
 *
 * Três decisões do módulo ficam travadas aqui porque são as que doem se mudarem:
 * a média diária é sobre os dias COM venda lançada (não sobre os dias do mês);
 * dia fora da faixa é DESCARTADO, nunca jogado no dia 1; e o preço do litro de
 * uma entrega é o PONDERADO das notas do dia.
 */
import { describe, it, expect } from 'vitest';
import {
    serieVendaDiaria,
    serieVendaMensal,
    serieEntregas,
    serieNivelEstoque,
    type VendaDoDia,
    type EntregaDoDia,
} from './serie-diaria';

describe('serieVendaDiaria — venda dia a dia com acumulado', () => {
    it('mês de zero dia devolve série vazia, sem NaN e sem -Infinity no pico', () => {
        expect(serieVendaDiaria([], 0)).toEqual({
            pontos: [],
            total: 0,
            pico: 0,
            mediaDiaria: 0,
            diasComVenda: 0,
        });
    });

    it('mês sem venda lançada devolve um ponto zerado por dia', () => {
        const serie = serieVendaDiaria([], 3);
        expect(serie.pontos).toEqual([
            { dia: 1, litros: 0, acumulado: 0 },
            { dia: 2, litros: 0, acumulado: 0 },
            { dia: 3, litros: 0, acumulado: 0 },
        ]);
        expect(serie.total).toBe(0);
        expect(serie.pico).toBe(0);
        expect(serie.mediaDiaria).toBe(0);
        expect(serie.diasComVenda).toBe(0);
    });

    it('acumula do dia 1 e divide a média pelos dias COM venda, não por 5', () => {
        const vendas: VendaDoDia[] = [
            { dia: 1, litros: 1000 },
            { dia: 2, litros: 2000 },
            { dia: 4, litros: 500 },
        ];
        expect(serieVendaDiaria(vendas, 5)).toEqual({
            pontos: [
                { dia: 1, litros: 1000, acumulado: 1000 },
                { dia: 2, litros: 2000, acumulado: 3000 },
                { dia: 3, litros: 0, acumulado: 3000 },
                { dia: 4, litros: 500, acumulado: 3500 },
                { dia: 5, litros: 0, acumulado: 3500 },
            ],
            total: 3500,
            pico: 2000,
            // 3500 ÷ 3 dias lançados. Dividir por 5 daria 700 e pareceria queda.
            mediaDiaria: 1166.6666666666667,
            diasComVenda: 3,
        });
    });

    it('vários registros do mesmo dia viram uma barra só', () => {
        const vendas: VendaDoDia[] = [
            { dia: 1, litros: 1000 },
            { dia: 1, litros: 500 },
        ];
        const serie = serieVendaDiaria(vendas, 3);
        expect(serie.pontos[0]).toEqual({ dia: 1, litros: 1500, acumulado: 1500 });
        expect(serie.diasComVenda).toBe(1);
        expect(serie.mediaDiaria).toBe(1500);
    });

    it('dia fora da faixa é DESCARTADO, não somado no dia 1', () => {
        const vendas: VendaDoDia[] = [
            { dia: 0, litros: 9999 },
            { dia: -3, litros: 9999 },
            { dia: 6, litros: 9999 },
            { dia: 2, litros: 1000 },
        ];
        const serie = serieVendaDiaria(vendas, 5);
        expect(serie.pontos[0].litros).toBe(0);
        expect(serie.total).toBe(1000);
        expect(serie.pico).toBe(1000);
    });

    it('soma em mililitro inteiro: 0,1 + 0,2 fecha em 0,3', () => {
        const serie = serieVendaDiaria(
            [
                { dia: 1, litros: 0.1 },
                { dia: 2, litros: 0.2 },
            ],
            2
        );
        expect(serie.total).toBe(0.3);
        expect(serie.pontos[1].acumulado).toBe(0.3);
    });

    it('três casas decimais fecham exato no acumulado', () => {
        const serie = serieVendaDiaria(
            [
                { dia: 1, litros: 1000.125 },
                { dia: 2, litros: 2000.875 },
            ],
            2
        );
        expect(serie.pontos[1].acumulado).toBe(3001);
        expect(serie.total).toBe(3001);
        expect(serie.mediaDiaria).toBe(1500.5);
    });

    it('litro negativo entra no total mas NÃO conta como dia com venda', () => {
        // Congelado: `diasComVenda` filtra `litros > 0`, então o dia negativo
        // sai da média. 900 ÷ 1 dia = 900.
        const serie = serieVendaDiaria(
            [
                { dia: 1, litros: -100 },
                { dia: 2, litros: 1000 },
            ],
            2
        );
        expect(serie.pontos[0]).toEqual({ dia: 1, litros: -100, acumulado: -100 });
        expect(serie.total).toBe(900);
        expect(serie.diasComVenda).toBe(1);
        expect(serie.mediaDiaria).toBe(900);
        expect(serie.pico).toBe(1000);
    });
});

describe('serieVendaMensal — janela fixa de meses', () => {
    it('preenche com 0 o mês sem venda lançada, nunca com número sorteado', () => {
        expect(
            serieVendaMensal(
                [
                    { mes: '1999-12', litros: 1000 },
                    { mes: '2000-02', litros: 3000 },
                ],
                '2000-02',
                3
            )
        ).toEqual([
            { mes: '1999-12', litros: 1000 },
            { mes: '2000-01', litros: 0 },
            { mes: '2000-02', litros: 3000 },
        ]);
    });

    it('vira o ano para trás pela aritmética da string ISO, sem Date', () => {
        expect(serieVendaMensal([], '2000-01', 2)).toEqual([
            { mes: '1999-12', litros: 0 },
            { mes: '2000-01', litros: 0 },
        ]);
    });

    it('soma vários registros do mesmo mês', () => {
        expect(
            serieVendaMensal(
                [
                    { mes: '2000-01', litros: 1000 },
                    { mes: '2000-01', litros: 500 },
                ],
                '2000-01',
                1
            )
        ).toEqual([{ mes: '2000-01', litros: 1500 }]);
    });

    it('registro fora da janela é descartado', () => {
        expect(serieVendaMensal([{ mes: '1999-01', litros: 9999 }], '2000-02', 2)).toEqual([
            { mes: '2000-01', litros: 0 },
            { mes: '2000-02', litros: 0 },
        ]);
    });

    it('janela de tamanho 0 devolve lista vazia', () => {
        expect(serieVendaMensal([{ mes: '2000-01', litros: 1000 }], '2000-01', 0)).toEqual([]);
    });

    it('lista vazia devolve a janela inteira zerada', () => {
        expect(serieVendaMensal([], '2000-03', 2)).toEqual([
            { mes: '2000-02', litros: 0 },
            { mes: '2000-03', litros: 0 },
        ]);
    });
});

describe('serieEntregas — uma linha por dia de entrega', () => {
    it('lista vazia devolve lista vazia', () => {
        expect(serieEntregas([])).toEqual([]);
    });

    it('ordena por dia e calcula o preço do litro', () => {
        const entregas: EntregaDoDia[] = [
            { dia: 3, litros: 1000, valor: 5000 },
            { dia: 1, litros: 2000, valor: 10000 },
        ];
        expect(serieEntregas(entregas)).toEqual([
            { dia: 1, litros: 2000, valor: 10000, precoLitro: 5 },
            { dia: 3, litros: 1000, valor: 5000, precoLitro: 5 },
        ]);
    });

    it('duas notas no mesmo dia viram uma entrega, com preço PONDERADO', () => {
        // 8000 L a R$ 5,00 + 500 L a R$ 6,00 = 8500 L por R$ 43.000,00.
        // Média das médias daria R$ 5,50 e daria peso igual às duas cargas.
        const entregas: EntregaDoDia[] = [
            { dia: 2, litros: 8000, valor: 40000 },
            { dia: 2, litros: 500, valor: 3000 },
        ];
        expect(serieEntregas(entregas)).toEqual([
            { dia: 2, litros: 8500, valor: 43000, precoLitro: 5.0588235294117645 },
        ]);
    });

    it('entrega sem litros devolve precoLitro null, nunca Infinity', () => {
        expect(serieEntregas([{ dia: 1, litros: 0, valor: 100 }])).toEqual([
            { dia: 1, litros: 0, valor: 100, precoLitro: null },
        ]);
    });

    it('quantiza o valor em centavos, mas o preço do litro mantém precisão total', () => {
        expect(
            serieEntregas([
                { dia: 1, litros: 1000, valor: 0.1 },
                { dia: 1, litros: 0, valor: 0.2 },
            ])
        ).toEqual([
            { dia: 1, litros: 1000, valor: 0.3, precoLitro: 0.00030000000000000003 },
        ]);
    });
});

describe('serieNivelEstoque — o nível teórico ao fim de cada dia', () => {
    it('entra entrega, sai venda, e o pico inclui o estoque de abertura', () => {
        const vendas: VendaDoDia[] = [
            { dia: 1, litros: 1000 },
            { dia: 3, litros: 2000 },
        ];
        const entregas: EntregaDoDia[] = [{ dia: 2, litros: 5000, valor: 25000 }];
        expect(serieNivelEstoque(10000, vendas, entregas, 4)).toEqual({
            pontos: [
                { dia: 1, entrou: 0, saiu: 1000, nivel: 9000 },
                { dia: 2, entrou: 5000, saiu: 0, nivel: 14000 },
                { dia: 3, entrou: 0, saiu: 2000, nivel: 12000 },
                { dia: 4, entrou: 0, saiu: 0, nivel: 12000 },
            ],
            pico: 14000,
            nivelFinal: 12000,
        });
    });

    it('sem entrega nenhuma, o pico é o estoque de abertura', () => {
        const serie = serieNivelEstoque(10000, [{ dia: 1, litros: 1000 }], [], 2);
        expect(serie.pico).toBe(10000);
        expect(serie.nivelFinal).toBe(9000);
    });

    it('série de zero dia devolve o estoque de abertura como pico e nível final', () => {
        expect(serieNivelEstoque(10000, [], [], 0)).toEqual({
            pontos: [],
            pico: 10000,
            nivelFinal: 10000,
        });
    });

    it('mês sem movimento mantém o nível reto', () => {
        const serie = serieNivelEstoque(5000, [], [], 3);
        expect(serie.pontos.map((p) => p.nivel)).toEqual([5000, 5000, 5000]);
        expect(serie.nivelFinal).toBe(5000);
    });

    it('vender mais do que havia deixa o nível NEGATIVO — a curva não é corrigida', () => {
        // O teórico não conhece perda: a diferença contra a régua É a perda, e
        // por isso a curva não pode ser travada em zero.
        expect(serieNivelEstoque(1000, [{ dia: 1, litros: 3000 }], [], 2)).toEqual({
            pontos: [
                { dia: 1, entrou: 0, saiu: 3000, nivel: -2000 },
                { dia: 2, entrou: 0, saiu: 0, nivel: -2000 },
            ],
            pico: 1000,
            nivelFinal: -2000,
        });
    });

    it('soma em mililitro: 0,1 + 0,3 − 0,2 fecha em 0,2', () => {
        const serie = serieNivelEstoque(
            0.1,
            [{ dia: 1, litros: 0.2 }],
            [{ dia: 1, litros: 0.3, valor: 0 }],
            1
        );
        expect(serie.nivelFinal).toBe(0.2);
    });
});
