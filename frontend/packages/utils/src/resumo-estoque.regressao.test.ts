/**
 * Regressão de fórmula — `resumo-estoque.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Correção contra a planilha segue no golden master
 * (`resumo-compra-estoque.golden.spec.ts` e `estoque-encadeamento.golden.spec.ts`),
 * que leem `docs/data/` e só rodam na máquina do dono. Esta suíte prova o que o CI
 * conseguia provar: que a fórmula NÃO MUDOU.
 *
 * O encadeamento congelado aqui é o do bloco `Estoque`:
 *
 *     compra_e_estoque = estoque_anterior + litros_comprados
 *     estoque_teorico  = compra_e_estoque − litros_vendidos
 *     perca_ou_sobra   = estoque_medido − estoque_teorico
 *
 * O SINAL é o inverso do da diferença de caixa: **negativo = PERDA**, positivo =
 * sobra. Este é o único módulo do sistema que responde "sumiu combustível?", e o
 * número que ele produz aponta o dedo para alguém — uma inversão de sinal aqui
 * transforma perda em sobra e cala o alarme.
 *
 * Entradas inventadas: 10.000 L em tanque, 5.000 comprados, 4.000 vendidos.
 * Nenhum valor abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import { resumoEstoque, type EntradaEstoqueProduto } from './resumo-estoque';

const mov = (
    produto: string,
    estoqueAnterior: number,
    litrosComprados: number,
    litrosVendidos: number,
    estoqueMedido: number | null
): EntradaEstoqueProduto => ({
    produto,
    estoqueAnterior,
    litrosComprados,
    litrosVendidos,
    estoqueMedido,
});

describe('resumoEstoque — encadeamento com perda e com sobra', () => {
    // Gasolina fecha 100 L abaixo do teórico (PERDA), Diesel 100 L acima (SOBRA).
    const r = resumoEstoque([
        mov('Gasolina', 10_000, 5000, 4000, 10_900),
        mov('Diesel', 5000, 2000, 1500, 5600),
    ]);

    it('compra e estoque é anterior + comprados', () => {
        expect(r.produtos[0].compraEEstoque).toBe(15_000);
        expect(r.produtos[1].compraEEstoque).toBe(7000);
    });

    it('estoque teórico desconta o vendido', () => {
        expect(r.produtos[0].estoqueTeorico).toBe(11_000);
        expect(r.produtos[1].estoqueTeorico).toBe(5500);
    });

    it('falta no tanque sai NEGATIVA — é perda', () => {
        expect(r.produtos[0].percaOuSobra).toBe(-100);
    });

    it('sobra no tanque sai POSITIVA', () => {
        expect(r.produtos[1].percaOuSobra).toBe(100);
    });

    it('percentual é sobre o VENDIDO e usa o módulo da diferença', () => {
        // 100 ÷ 4000 = 2,5 %. Positivo mesmo quando a perda é negativa.
        expect(r.produtos[0].percentualSobreVenda).toBe(2.5);
        expect(r.produtos[1].percentualSobreVenda).toBe(6.666666666666667);
    });

    it('acusa perda quando ao menos um produto fechou negativo', () => {
        expect(r.temPerda).toBe(true);
        expect(r.temProdutoSemMedicao).toBe(false);
    });
});

describe('resumoEstoque — perda e sobra se anulam no total', () => {
    // −100 de Gasolina e +100 de Diesel dão total 0. O total sozinho diria "tanque
    // certinho". Quem denuncia é `temPerda`, que olha produto a produto.
    const r = resumoEstoque([
        mov('Gasolina', 10_000, 5000, 4000, 10_900),
        mov('Diesel', 5000, 2000, 1500, 5600),
    ]);

    it('totais somam cada coluna dos produtos', () => {
        expect(r.totais.produto).toBe('Total');
        expect(r.totais.estoqueAnterior).toBe(15_000);
        expect(r.totais.litrosComprados).toBe(7000);
        expect(r.totais.litrosVendidos).toBe(5500);
        expect(r.totais.compraEEstoque).toBe(22_000);
        expect(r.totais.estoqueTeorico).toBe(16_500);
        expect(r.totais.estoqueMedido).toBe(16_500);
    });

    it('o total zera e é `temPerda` quem continua acusando', () => {
        expect(r.totais.percaOuSobra).toBe(0);
        expect(r.totais.percentualSobreVenda).toBe(0);
        expect(r.temPerda).toBe(true);
    });
});

describe('resumoEstoque — tanque NÃO medido', () => {
    // "Não medi" e "não perdi" são estados diferentes. Zero aqui transformaria
    // tanque não conferido em tanque conferido e certo.
    const r = resumoEstoque([
        mov('Gasolina', 10_000, 5000, 4000, 10_900),
        mov('Diesel', 5000, 2000, 1500, null),
    ]);

    it('sem medição a perda vem null, nunca 0', () => {
        expect(r.produtos[1].estoqueMedido).toBeNull();
        expect(r.produtos[1].percaOuSobra).toBeNull();
        expect(r.produtos[1].percentualSobreVenda).toBeNull();
    });

    it('o teórico continua sendo calculado — ele não depende da régua', () => {
        expect(r.produtos[1].compraEEstoque).toBe(7000);
        expect(r.produtos[1].estoqueTeorico).toBe(5500);
    });

    it('UM tanque não medido apaga a perda do TOTAL inteiro', () => {
        // Total parcial com cara de completo é pior que total nenhum.
        expect(r.totais.estoqueMedido).toBeNull();
        expect(r.totais.percaOuSobra).toBeNull();
        expect(r.totais.percentualSobreVenda).toBeNull();
    });

    it('as colunas de movimento do total seguem somadas', () => {
        expect(r.totais.litrosVendidos).toBe(5500);
        expect(r.totais.estoqueTeorico).toBe(16_500);
    });

    it('sinaliza a medição faltante sem esconder a perda já apurada', () => {
        expect(r.temProdutoSemMedicao).toBe(true);
        expect(r.temPerda).toBe(true);
    });
});

describe('resumoEstoque — lista vazia', () => {
    const r = resumoEstoque([]);

    it('não quebra e devolve total zerado', () => {
        expect(r.produtos).toEqual([]);
        expect(r.totais.produto).toBe('Total');
        expect(r.totais.estoqueAnterior).toBe(0);
        expect(r.totais.litrosComprados).toBe(0);
        expect(r.totais.litrosVendidos).toBe(0);
        expect(r.totais.compraEEstoque).toBe(0);
        expect(r.totais.estoqueTeorico).toBe(0);
    });

    it('sem produto nenhum a medição do total é null, não 0', () => {
        // `todosMedidos` exige `length > 0`: lista vazia não é "tudo medido".
        expect(r.totais.estoqueMedido).toBeNull();
        expect(r.totais.percaOuSobra).toBeNull();
        expect(r.totais.percentualSobreVenda).toBeNull();
    });

    it('não acusa perda nem medição faltante', () => {
        expect(r.temPerda).toBe(false);
        expect(r.temProdutoSemMedicao).toBe(false);
    });
});

describe('resumoEstoque — divisor zero', () => {
    it('sem venda no mês o percentual vem null, mas a perda é apurada', () => {
        const r = resumoEstoque([mov('Gasolina', 10_000, 5000, 0, 14_900)]);

        expect(r.produtos[0].estoqueTeorico).toBe(15_000);
        expect(r.produtos[0].percaOuSobra).toBe(-100);
        expect(r.produtos[0].percentualSobreVenda).toBeNull();
        expect(r.temPerda).toBe(true);
    });
});

describe('resumoEstoque — tanque bate exatamente', () => {
    it('medido igual ao teórico dá 0, e 0 não é perda', () => {
        const r = resumoEstoque([mov('Gasolina', 10_000, 5000, 4000, 11_000)]);

        expect(r.produtos[0].percaOuSobra).toBe(0);
        expect(r.produtos[0].percentualSobreVenda).toBe(0);
        expect(r.temPerda).toBe(false);
    });
});

describe('resumoEstoque — teórico negativo', () => {
    it('vender mais do que havia deixa o teórico negativo e vira sobra aparente', () => {
        // 1000 L em tanque, 0 comprados, 1500 vendidos: fisicamente impossível, e o
        // módulo não inventa piso. O teórico vai a −500 e a régua em 0 produz +500,
        // que a estrutura classifica como SOBRA. Fica congelado como está: quem
        // decide o que fazer com o impossível é a tela, não a fórmula.
        const r = resumoEstoque([mov('Gasolina', 1000, 0, 1500, 0)]);

        expect(r.produtos[0].compraEEstoque).toBe(1000);
        expect(r.produtos[0].estoqueTeorico).toBe(-500);
        expect(r.produtos[0].percaOuSobra).toBe(500);
        expect(r.produtos[0].percentualSobreVenda).toBe(33.33333333333333);
        expect(r.temPerda).toBe(false);
    });
});

describe('resumoEstoque — aritmética em mililitro inteiro', () => {
    it('1000,1 + 2000,2 − 3000,3 fecha em 0 exato', () => {
        // Em float puro esse encadeamento deixa resíduo, e o resíduo entra direto
        // na perda apurada — o número que aponta o dedo para alguém.
        const r = resumoEstoque([mov('Gasolina', 1000.1, 2000.2, 3000.3, 0)]);

        expect(r.produtos[0].compraEEstoque).toBe(3000.3);
        expect(r.produtos[0].estoqueTeorico).toBe(0);
        expect(r.produtos[0].percaOuSobra).toBe(0);
        expect(r.produtos[0].percentualSobreVenda).toBe(0);
        expect(r.temPerda).toBe(false);
    });

    it('as colunas de entrada são devolvidas sem arredondar', () => {
        const r = resumoEstoque([mov('Gasolina', 1000.1, 2000.2, 3000.3, 0)]);

        expect(r.produtos[0].estoqueAnterior).toBe(1000.1);
        expect(r.produtos[0].litrosComprados).toBe(2000.2);
        expect(r.produtos[0].litrosVendidos).toBe(3000.3);
    });
});
