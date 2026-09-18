/**
 * Regressão de fórmula — `lucro.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Esta suíte NÃO prova correção contra a planilha do posto: isso continua sendo
 * trabalho do golden master (`lucro.golden.spec.ts`, `lucro-real.golden.spec.ts`),
 * que lê `docs/data/` e por isso só roda na máquina do dono.
 *
 * O que ela prova é outra coisa, e é o que falta no CI: que a fórmula NÃO MUDOU.
 * Entradas inventadas (1000 litros, R$ 6,00/L), saídas congeladas em literais
 * escritos à mão a partir da execução real das funções. Se um número aqui mudar,
 * alguém mexeu numa fórmula de dinheiro — e o golden local é quem decide se a
 * mudança é conserto ou regressão.
 *
 * Nenhum valor abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import {
    emCentavos,
    despesaOperacionalPorLitro,
    custoMedioCompra,
    custoLitrosVendidos,
    lucroCombustivel,
    margemPercentual,
    precoParaMargem,
    type CompraDoProduto,
    type ProdutoDoPeriodo,
} from './lucro';

describe('emCentavos — quantização de dinheiro', () => {
    it('devolve inteiro intacto', () => {
        expect(emCentavos(1000 * 6)).toBe(6000);
    });

    it('arredonda meio centavo para cima', () => {
        expect(emCentavos(10.005)).toBe(10.01);
    });

    it('descarta o terceiro decimal abaixo do meio', () => {
        expect(emCentavos(10.004)).toBe(10);
    });

    it('mata o drift de float da soma', () => {
        expect(emCentavos(0.1 + 0.2)).toBe(0.3);
    });

    it('arredonda negativo para longe do zero quando o meio centavo é exato em binário', () => {
        expect(emCentavos(-3.456)).toBe(-3.46);
    });

    it('2,675 sobe para 2,68 (o float é 2.67500000000000017...)', () => {
        expect(emCentavos(2.675)).toBe(2.68);
    });

    it('meio centavo negativo cai em -0, não em -0,01', () => {
        // Math.round(-0.5) === -0. Congelado porque um `=== 0` na UI continua
        // verdadeiro, mas `Object.is(x, 0)` e `String(x)` NÃO.
        expect(Object.is(emCentavos(-0.005), -0)).toBe(true);
    });
});

describe('despesaOperacionalPorLitro — rateio mensal', () => {
    it('rateia R$ 1.000 sobre 10.000 L', () => {
        expect(despesaOperacionalPorLitro(1000, 10000)).toBe(0.1);
    });

    it('litros 0 → 0 (não divide, não devolve Infinity)', () => {
        expect(despesaOperacionalPorLitro(1000, 0)).toBe(0);
    });

    it('litros negativos → 0 (guarda é `> 0`, não `!== 0`)', () => {
        expect(despesaOperacionalPorLitro(1000, -10)).toBe(0);
    });

    it('sem despesa → 0', () => {
        expect(despesaOperacionalPorLitro(0, 10000)).toBe(0);
    });

    it('despesa negativa (estorno) passa e vira rateio negativo', () => {
        expect(despesaOperacionalPorLitro(-500, 10000)).toBe(-0.05);
    });

    it('NÃO quantiza: mantém a dízima inteira (não é dinheiro final)', () => {
        expect(despesaOperacionalPorLitro(100, 3)).toBe(33.333333333333336);
    });
});

describe('custoMedioCompra — ponderado por volume', () => {
    it('uma compra: 2.000 L por R$ 10.000 → R$ 5,00/L', () => {
        const compras: CompraDoProduto[] = [{ litros: 2000, valorTotal: 10000 }];
        expect(custoMedioCompra(compras)).toBe(5);
    });

    it('duas compras: pondera pelo volume, não pela média das médias', () => {
        // Média simples daria (5,00 + 6,00)/2 = 5,50. O ponderado é 5,75.
        const compras: CompraDoProduto[] = [
            { litros: 1000, valorTotal: 5000 },
            { litros: 3000, valorTotal: 18000 },
        ];
        expect(custoMedioCompra(compras)).toBe(5.75);
    });

    it('SEM compra no período → null, NUNCA 0', () => {
        expect(custoMedioCompra([])).toBeNull();
    });

    it('compra com 0 litros → null (não divide por zero, não vira 0)', () => {
        expect(custoMedioCompra([{ litros: 0, valorTotal: 500 }])).toBeNull();
    });

    it('compras que se cancelam (devolução) somam 0 litros → null', () => {
        const compras: CompraDoProduto[] = [
            { litros: 1000, valorTotal: 5000 },
            { litros: -1000, valorTotal: -5000 },
        ];
        expect(custoMedioCompra(compras)).toBeNull();
    });

    it('NÃO quantiza: R$/L guarda a precisão total', () => {
        expect(custoMedioCompra([{ litros: 3, valorTotal: 10 }])).toBe(3.3333333333333335);
    });
});

describe('custoLitrosVendidos — custo do período por produto', () => {
    const feliz: ProdutoDoPeriodo[] = [
        { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 2000, valorTotal: 10000 }] },
        { produto: 'DIESEL', litrosVendidos: 500, compras: [{ litros: 1000, valorTotal: 4000 }] },
    ];

    it('soma cada produto ao seu custo médio: 1000×5,00 + 500×4,00', () => {
        expect(custoLitrosVendidos(feliz)).toEqual({ custo: 7000, produtosSemCompra: [] });
    });

    it('lista vazia → custo 0 e nenhum produto pendente', () => {
        expect(custoLitrosVendidos([])).toEqual({ custo: 0, produtosSemCompra: [] });
    });

    it('produto VENDIDO SEM COMPRA derruba o total para null e se nomeia', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 2000, valorTotal: 10000 }] },
            { produto: 'ETANOL', litrosVendidos: 200, compras: [] },
        ];
        // O custo da GASOLINA (5.000) NÃO sobrevive: o total inteiro é não-apurável.
        expect(custoLitrosVendidos(produtos)).toEqual({ custo: null, produtosSemCompra: ['ETANOL'] });
    });

    it('vários sem compra: todos os nomes, na ordem de entrada', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'ETANOL', litrosVendidos: 200, compras: [] },
            { produto: 'GNV', litrosVendidos: 100, compras: [{ litros: 0, valorTotal: 0 }] },
        ];
        expect(custoLitrosVendidos(produtos)).toEqual({
            custo: null,
            produtosSemCompra: ['ETANOL', 'GNV'],
        });
    });

    it('produto SEM VENDA (0 L) não pesa no total nem entra em produtosSemCompra', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 2000, valorTotal: 10000 }] },
            { produto: 'ETANOL', litrosVendidos: 0, compras: [] },
        ];
        expect(custoLitrosVendidos(produtos)).toEqual({ custo: 5000, produtosSemCompra: [] });
    });

    it('produto com litros negativos também é ignorado (guarda é `<= 0`)', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 2000, valorTotal: 10000 }] },
            { produto: 'ETANOL', litrosVendidos: -50, compras: [] },
        ];
        expect(custoLitrosVendidos(produtos)).toEqual({ custo: 5000, produtosSemCompra: [] });
    });

    it('QUANTIZA o total em centavos: 1000 × (10.000/3.000) = 3.333,33', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 3000, valorTotal: 10000 }] },
        ];
        // Sem emCentavos o valor seria 3333.3333333333335.
        expect(custoLitrosVendidos(produtos).custo).toBe(3333.33);
    });
});

describe('lucroCombustivel — receita − litros × (custo + despesa/L)', () => {
    it('1.000 L a R$ 6,00, custo R$ 5,00, despesa R$ 0,10/L → R$ 900,00', () => {
        expect(
            lucroCombustivel({ litros: 1000, precoVenda: 6, custoMedio: 5, despesaOperacionalLitro: 0.1 })
        ).toBe(900);
    });

    it('sem despesa operacional o lucro é só a margem bruta: R$ 1.000,00', () => {
        expect(
            lucroCombustivel({ litros: 1000, precoVenda: 6, custoMedio: 5, despesaOperacionalLitro: 0 })
        ).toBe(1000);
    });

    it('0 litros → 0 (sem venda, sem custo)', () => {
        expect(
            lucroCombustivel({ litros: 0, precoVenda: 6, custoMedio: 5, despesaOperacionalLitro: 0.1 })
        ).toBe(0);
    });

    it('vender abaixo do custo dá PREJUÍZO negativo, não 0', () => {
        // 1000 × 5,00 − 1000 × (5,50 + 0,20) = 5.000 − 5.700
        expect(
            lucroCombustivel({ litros: 1000, precoVenda: 5, custoMedio: 5.5, despesaOperacionalLitro: 0.2 })
        ).toBe(-700);
    });

    it('QUANTIZA em centavos: R$ 1,005 fecha em R$ 1,00 (float é 1.00499...)', () => {
        expect(
            lucroCombustivel({ litros: 1, precoVenda: 6.005, custoMedio: 5, despesaOperacionalLitro: 0 })
        ).toBe(1);
    });
});

describe('margemPercentual — lucro ÷ receita × 100', () => {
    it('R$ 900 sobre R$ 6.000 → 15%', () => {
        expect(margemPercentual(900, 6000)).toBe(15);
    });

    it('receita 0 → 0% (não Infinity, não NaN)', () => {
        expect(margemPercentual(900, 0)).toBe(0);
    });

    it('receita negativa → 0% (guarda é `> 0`)', () => {
        expect(margemPercentual(900, -6000)).toBe(0);
    });

    it('prejuízo vira percentual negativo', () => {
        expect(margemPercentual(-300, 6000)).toBe(-5);
    });

    it('NÃO quantiza: devolve a dízima', () => {
        expect(margemPercentual(1, 3)).toBe(33.33333333333333);
    });
});

describe('precoParaMargem — custo ÷ (1 − margem%)', () => {
    it('custo R$ 5,00 com 20% SOBRE O PREÇO → R$ 6,25 (markup daria 6,00)', () => {
        expect(precoParaMargem(5, 20)).toBe(6.25);
    });

    it('margem 0% → o próprio custo', () => {
        expect(precoParaMargem(5, 0)).toBe(5);
    });

    it('margem 100% diverge para Infinity (quem chama põe o teto)', () => {
        expect(precoParaMargem(5, 100)).toBe(Infinity);
    });

    it('margem acima de 100% vira preço negativo — sem contraparte física', () => {
        expect(precoParaMargem(5, 125)).toBe(-20);
    });

    it('NÃO quantiza: devolve R$/L cru', () => {
        expect(precoParaMargem(5.1, 15)).toBe(6);
    });

    it('é a inversa de margemPercentual (margem sobre preço, não sobre custo)', () => {
        const preco = precoParaMargem(5, 20);
        expect(margemPercentual(preco - 5, preco)).toBe(20);
    });
});

describe('identidade do modelo: lucro = venda − custo − despesas', () => {
    it('dois produtos fecham pelo caminho das funções e pela conta direta', () => {
        const produtos: ProdutoDoPeriodo[] = [
            { produto: 'GASOLINA', litrosVendidos: 1000, compras: [{ litros: 2000, valorTotal: 10000 }] },
            { produto: 'DIESEL', litrosVendidos: 500, compras: [{ litros: 1000, valorTotal: 4000 }] },
        ];
        const despesasTotais = 300;
        const litrosVendidos = 1500;

        const despesaLitro = despesaOperacionalPorLitro(despesasTotais, litrosVendidos);
        expect(despesaLitro).toBe(0.2);

        const { custo } = custoLitrosVendidos(produtos);
        expect(custo).toBe(7000);

        const lucroGasolina = lucroCombustivel({
            litros: 1000,
            precoVenda: 6,
            custoMedio: 5,
            despesaOperacionalLitro: despesaLitro,
        });
        const lucroDiesel = lucroCombustivel({
            litros: 500,
            precoVenda: 4.5,
            custoMedio: 4,
            despesaOperacionalLitro: despesaLitro,
        });
        expect(lucroGasolina).toBe(800);
        expect(lucroDiesel).toBe(150);
        expect(emCentavos(lucroGasolina + lucroDiesel)).toBe(950);

        // Mesmo número pela conta direta: venda 8.250 − custo 7.000 − despesas 300.
        expect(emCentavos(1000 * 6 + 500 * 4.5)).toBe(8250);
        expect(950).toBe(8250 - 7000 - 300);
    });

    it('margem do período sobre a receita sintética → 11,51...%', () => {
        expect(margemPercentual(950, 8250)).toBe(11.515151515151516);
    });
});
