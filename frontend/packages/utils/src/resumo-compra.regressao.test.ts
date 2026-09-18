/**
 * Regressão de fórmula — `resumo-compra.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Correção contra a planilha continua sendo trabalho do golden master
 * (`resumo-compra-estoque.golden.spec.ts`), que lê `docs/data/` e só roda na
 * máquina do dono. Esta suíte prova a outra coisa, a que o CI conseguia provar:
 * que a fórmula NÃO MUDOU.
 *
 * As três contas congeladas aqui são as do bloco `Compra e Custo.`:
 *
 *     media_lt        = valor ÷ litros
 *     valor_pra_venda = media_lt + despesa_por_litro
 *     percentual      = despesa_por_litro ÷ valor_pra_venda × 100
 *
 * `valorParaVenda` é PISO, não preço sugerido — vender nele dá lucro zero. Se
 * esse número subir sozinho num diff, o posto passa a achar que precisa cobrar
 * mais do que precisa (ou menos, o que é pior).
 *
 * Entradas inventadas: 1000 L a R$ 5,00/L, R$ 0,50/L de despesa. Nenhum valor
 * abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import { resumoCompra, type EntradaCompraProduto } from './resumo-compra';

const compra = (produto: string, litros: number, valor: number): EntradaCompraProduto => ({
    produto,
    litros,
    valor,
});

/** Despesa operacional rateada por litro VENDIDO: R$ 0,50. */
const DESPESA_LITRO = 0.5;

describe('resumoCompra — caminho feliz, dois produtos', () => {
    // Gasolina: 1000 L por R$ 5.000 (R$ 5,00/L). Diesel: 500 L por R$ 2.000 (R$ 4,00/L).
    const r = resumoCompra(
        [compra('Gasolina', 1000, 5000), compra('Diesel', 500, 2000)],
        DESPESA_LITRO,
        true
    );

    it('média por litro é valor ÷ litros', () => {
        expect(r.produtos[0].mediaLitro).toBe(5);
        expect(r.produtos[1].mediaLitro).toBe(4);
    });

    it('valor para venda é a média mais a despesa rateada', () => {
        expect(r.produtos[0].valorParaVenda).toBe(5.5);
        expect(r.produtos[1].valorParaVenda).toBe(4.5);
    });

    it('percentual é quanto do piso é despesa operacional', () => {
        expect(r.produtos[0].percentualDespesa).toBe(9.090909090909092);
        expect(r.produtos[1].percentualDespesa).toBe(11.11111111111111);
    });

    it('totais somam litros e valor antes de dividir', () => {
        // R$ 7.000 ÷ 1500 L = 4,666…, e NÃO a média das médias (4,50).
        expect(r.totais.produto).toBe('Total');
        expect(r.totais.litros).toBe(1500);
        expect(r.totais.valor).toBe(7000);
        expect(r.totais.mediaLitro).toBe(4.666666666666667);
        expect(r.totais.valorParaVenda).toBe(5.166666666666667);
        expect(r.totais.percentualDespesa).toBe(9.67741935483871);
    });

    it('devolve a despesa recebida sem recalcular', () => {
        expect(r.despesaPorLitro).toBe(0.5);
        expect(r.temDespesa).toBe(true);
    });
});

describe('resumoCompra — produto SEM compra no período', () => {
    // Zero litro comprado: não há custo médio a apurar. Devolver 0 diria "comprei
    // de graça", que é o mesmo erro que `custoMedioCompra` evita devolvendo null.
    const r = resumoCompra(
        [compra('Gasolina', 1000, 5000), compra('Etanol', 0, 0)],
        DESPESA_LITRO,
        true
    );

    it('média por litro vem null, não 0', () => {
        expect(r.produtos[1].produto).toBe('Etanol');
        expect(r.produtos[1].mediaLitro).toBeNull();
    });

    it('sem média não há piso de venda — também null', () => {
        expect(r.produtos[1].valorParaVenda).toBeNull();
    });

    it('percentual cai para 0 quando não há piso sobre o que calcular', () => {
        expect(r.produtos[1].percentualDespesa).toBe(0);
    });

    it('o produto sem compra não mexe nos totais', () => {
        expect(r.totais.litros).toBe(1000);
        expect(r.totais.valor).toBe(5000);
        expect(r.totais.mediaLitro).toBe(5);
        expect(r.totais.valorParaVenda).toBe(5.5);
    });
});

describe('resumoCompra — divisor zero e lista vazia', () => {
    it('lista vazia devolve totais nulos, sem NaN e sem quebrar', () => {
        const r = resumoCompra([], DESPESA_LITRO, true);

        expect(r.produtos).toEqual([]);
        expect(r.totais.produto).toBe('Total');
        expect(r.totais.litros).toBe(0);
        expect(r.totais.valor).toBe(0);
        expect(r.totais.mediaLitro).toBeNull();
        expect(r.totais.valorParaVenda).toBeNull();
        expect(r.totais.percentualDespesa).toBe(0);
        expect(r.despesaPorLitro).toBe(0.5);
    });

    it('litro comprado com valor zero: média 0, e o piso é só a despesa', () => {
        // Litros > 0 com valor 0 é diferente de litros 0: aqui a divisão acontece.
        const r = resumoCompra([compra('Gasolina', 1000, 0)], DESPESA_LITRO, true);

        expect(r.produtos[0].mediaLitro).toBe(0);
        expect(r.produtos[0].valorParaVenda).toBe(0.5);
        expect(r.produtos[0].percentualDespesa).toBe(100);
    });
});

describe('resumoCompra — mês sem despesa lançada', () => {
    const r = resumoCompra([compra('Gasolina', 1000, 5000)], 0, false);

    it('sem rateio o piso é só o custo de compra', () => {
        expect(r.produtos[0].mediaLitro).toBe(5);
        expect(r.produtos[0].valorParaVenda).toBe(5);
    });

    it('percentual zera e a flag denuncia o piso subestimado', () => {
        expect(r.produtos[0].percentualDespesa).toBe(0);
        expect(r.despesaPorLitro).toBe(0);
        expect(r.temDespesa).toBe(false);
    });
});

describe('resumoCompra — quantização em centavos', () => {
    // Dois produtos de R$ 1.000,005 cada. Cada linha arredonda antes de somar, então
    // o total é 2 × 1000,01 = 2000,02, e não emCentavos(2000,01).
    const r = resumoCompra(
        [compra('Gasolina', 1000, 1000.005), compra('Diesel', 1000, 1000.005)],
        DESPESA_LITRO,
        true
    );

    it('valor de cada linha é quantizado em centavos', () => {
        expect(r.produtos[0].valor).toBe(1000.01);
        expect(r.produtos[1].valor).toBe(1000.01);
    });

    it('o total soma valores JÁ quantizados — meio centavo por linha', () => {
        expect(r.totais.valor).toBe(2000.02);
    });

    it('média e piso saem do valor CRU, não do quantizado', () => {
        // Detalhe real do módulo: `montarLinha` divide `valor` antes de `emCentavos`.
        // 1000,005 ÷ 1000 = 1,000005, não 1,00001.
        expect(r.produtos[0].mediaLitro).toBe(1.000005);
        expect(r.produtos[0].valorParaVenda).toBe(1.500005);
        expect(r.produtos[0].percentualDespesa).toBe(33.33322222259259);
    });

    it('já o total divide o valor quantizado acumulado', () => {
        expect(r.totais.mediaLitro).toBe(1.00001);
        expect(r.totais.valorParaVenda).toBe(1.50001);
        expect(r.totais.percentualDespesa).toBe(33.33311111259258);
    });
});

describe('resumoCompra — litros somados em mililitro inteiro', () => {
    it('0,1 + 0,2 comprados fecham em 0,3, sem ruído de float', () => {
        const r = resumoCompra(
            [compra('Gasolina', 0.1, 1), compra('Diesel', 0.2, 2)],
            DESPESA_LITRO,
            true
        );

        expect(r.totais.litros).toBe(0.3);
    });
});
