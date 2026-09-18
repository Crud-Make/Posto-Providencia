/**
 * Regressão de fórmula — `resumo-produto.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Esta suíte NÃO prova correção contra a planilha do posto: quem prova é o golden
 * master (`resumo-produto.golden.spec.ts`), que lê `docs/data/` e por isso só roda
 * na máquina do dono. O CI nunca viu aquele dado e nunca verá.
 *
 * O que esta suíte prova é a outra metade, e é a que faltava: que a fórmula NÃO
 * MUDOU. Entradas inventadas (1000 litros, R$ 6,00/L, R$ 5,00/L de custo), saídas
 * congeladas em literais escritos à mão a partir da execução real da função. Se um
 * número aqui mudar, alguém mexeu numa fórmula de dinheiro — e aí é o golden local
 * que decide se a mudança foi conserto ou regressão.
 *
 * Nenhum valor abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import { resumoPorProduto, type EntradaBicoMes } from './resumo-produto';

/** Bico sintético: tudo desligado por padrão, o teste liga só o que interessa. */
const bico = (
    campos: Partial<EntradaBicoMes> & { bico: string; produto: string }
): EntradaBicoMes => ({
    inicial: null,
    fechamento: null,
    litros: 0,
    venda: 0,
    precoMedio: null,
    custoMedio: null,
    ...campos,
});

/** Despesa operacional rateada: R$ 0,50 por litro. Redonda de propósito. */
const DESPESA_LITRO = 0.5;

describe('resumoPorProduto — caminho feliz, 3 bicos e 2 produtos', () => {
    // Gasolina em dois bicos (1000 L + 500 L a R$ 6,00), Diesel em um (500 L a R$ 5,00).
    const entradas: EntradaBicoMes[] = [
        bico({
            bico: 'Bico 01',
            produto: 'Gasolina',
            inicial: 10_000,
            fechamento: 11_000,
            litros: 1000,
            venda: 6000,
            precoMedio: 6,
            custoMedio: 5,
        }),
        bico({
            bico: 'Bico 02',
            produto: 'Gasolina',
            inicial: 20_000,
            fechamento: 20_500,
            litros: 500,
            venda: 3000,
            precoMedio: 6,
            custoMedio: 5,
        }),
        bico({
            bico: 'Bico 03',
            produto: 'Diesel',
            inicial: 30_000,
            fechamento: 30_500,
            litros: 500,
            venda: 2500,
            precoMedio: 5,
            custoMedio: 4,
        }),
    ];

    const r = resumoPorProduto(entradas, DESPESA_LITRO, true);

    it('lucro por litro é preço − custo − despesa rateada', () => {
        expect(r.bicos[0].lucroLitro).toBe(0.5);
        expect(r.bicos[1].lucroLitro).toBe(0.5);
        expect(r.bicos[2].lucroLitro).toBe(0.5);
    });

    it('lucro do bico é litros × lucro por litro, quantizado', () => {
        expect(r.bicos[0].lucro).toBe(500);
        expect(r.bicos[1].lucro).toBe(250);
        expect(r.bicos[2].lucro).toBe(250);
    });

    it('margem do bico é lucro ÷ venda × 100', () => {
        expect(r.bicos[0].margem).toBe(8.333333333333332);
        expect(r.bicos[2].margem).toBe(10);
    });

    it('preserva encerrante inicial e de fechamento sem tocar', () => {
        expect(r.bicos[0].inicial).toBe(10_000);
        expect(r.bicos[0].fechamento).toBe(11_000);
    });

    it('agrupa os dois bicos de Gasolina numa linha só', () => {
        expect(r.produtos).toHaveLength(2);
        expect(r.produtos[0].produto).toBe('Gasolina');
        expect(r.produtos[0].bicos).toEqual(['Bico 01', 'Bico 02']);
        expect(r.produtos[0].litros).toBe(1500);
        expect(r.produtos[0].venda).toBe(9000);
        expect(r.produtos[0].lucro).toBe(750);
    });

    it('participação é dos litros do PRODUTO, não do bico', () => {
        // 1500 de 2000 litros. Por bico dariam 50% + 25%, e a leitura do dono
        // seria de que a Gasolina é metade da operação em vez de três quartos.
        expect(r.produtos[0].participacaoLitros).toBe(75);
        expect(r.produtos[1].participacaoLitros).toBe(25);
    });

    it('preço médio do produto é venda ÷ litros', () => {
        expect(r.produtos[0].precoMedio).toBe(6);
        expect(r.produtos[1].precoMedio).toBe(5);
    });

    it('totais somam os bicos, não os produtos', () => {
        expect(r.totais.litros).toBe(2000);
        expect(r.totais.venda).toBe(11_500);
        expect(r.totais.lucro).toBe(1000);
        expect(r.totais.margem).toBe(8.695652173913043);
        expect(r.totais.precoMedio).toBe(5.75);
        expect(r.totais.despesaPorLitro).toBe(0.5);
    });

    it('marca o mês inteiro como apurado', () => {
        expect(r.apurado).toBe(true);
        expect(r.temDespesa).toBe(true);
    });
});

describe('resumoPorProduto — produto SEM compra no período', () => {
    // O caso que o JSDoc de EntradaBicoMes.custoMedio protege: sem compra, o custo
    // médio é `null`, e o lucro não é apurável. Usar o `preco_custo` do cadastro
    // (um preço só, o de hoje) daria número plausível e errado.
    const r = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: 5,
            }),
            bico({
                bico: 'Bico 03',
                produto: 'Diesel',
                litros: 500,
                venda: 2500,
                precoMedio: 5,
                custoMedio: null,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    it('lucro por litro vem null, nunca um número', () => {
        expect(r.bicos[1].lucroLitro).toBeNull();
    });

    it('lucro do bico cai para 0 mas a linha vem marcada como NÃO apurada', () => {
        // Os dois juntos é que dão a leitura certa: 0 sozinho seria "não lucrou".
        expect(r.bicos[1].lucro).toBe(0);
        expect(r.bicos[1].apurado).toBe(false);
        expect(r.bicos[0].apurado).toBe(true);
    });

    it('a venda do bico não apurado continua entrando nos totais', () => {
        // Vendeu de verdade; o que falta é saber quanto custou.
        expect(r.bicos[1].venda).toBe(2500);
        expect(r.totais.venda).toBe(8500);
        expect(r.totais.litros).toBe(1500);
    });

    it('o lucro total é parcial e o resumo avisa que é parcial', () => {
        expect(r.totais.lucro).toBe(500);
        expect(r.apurado).toBe(false);
    });

    it('contamina só o produto sem custo, não o vizinho', () => {
        expect(r.produtos[0].apurado).toBe(true);
        expect(r.produtos[1].apurado).toBe(false);
        expect(r.produtos[1].lucro).toBe(0);
    });
});

describe('resumoPorProduto — custo null NÃO é custo zero', () => {
    // Prova por contraste, contra o bug do "preço único" que o JSDoc descreve:
    // se alguém trocar o `null` por um `0` em qualquer ponto do caminho, o lucro
    // salta de 0 (não apurável) para 5500 (mentira plausível). Os dois números
    // ficam congelados lado a lado para que a troca apareça.
    const semCusto = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: null,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    const custoZero = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: 0,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    it('sem custo: lucro 0 e apurado false', () => {
        expect(semCusto.totais.lucro).toBe(0);
        expect(semCusto.apurado).toBe(false);
    });

    it('custo zero de verdade: lucro 5500 e apurado true', () => {
        expect(custoZero.totais.lucro).toBe(5500);
        expect(custoZero.bicos[0].lucroLitro).toBe(5.5);
        expect(custoZero.totais.margem).toBe(91.66666666666666);
        expect(custoZero.apurado).toBe(true);
    });
});

describe('resumoPorProduto — um bico sem custo derruba o produto inteiro', () => {
    // Dois bicos da mesma Gasolina, um com custo e outro sem. O lucro exibido
    // seria a soma de um bico onde deveriam ser dois.
    const r = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: 5,
            }),
            bico({
                bico: 'Bico 05',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: null,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    it('junta os dois bicos num produto só', () => {
        expect(r.produtos).toHaveLength(1);
        expect(r.produtos[0].bicos).toEqual(['Bico 01', 'Bico 05']);
        expect(r.produtos[0].litros).toBe(2000);
        expect(r.produtos[0].venda).toBe(12_000);
    });

    it('o produto vem NÃO apurado mesmo com metade dos bicos apurada', () => {
        expect(r.produtos[0].apurado).toBe(false);
        expect(r.apurado).toBe(false);
    });

    it('a margem do produto sai diluída — venda inteira, lucro pela metade', () => {
        expect(r.produtos[0].lucro).toBe(500);
        expect(r.produtos[0].margem).toBe(4.166666666666666);
    });
});

describe('resumoPorProduto — bico sem preço médio', () => {
    // Vendeu litro, mas o preço médio não pôde ser apurado. O lucro cai junto.
    const r = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: null,
                custoMedio: 5,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    it('preço null também derruba a apuração', () => {
        expect(r.bicos[0].lucroLitro).toBeNull();
        expect(r.bicos[0].lucro).toBe(0);
        expect(r.bicos[0].apurado).toBe(false);
        expect(r.apurado).toBe(false);
    });

    it('o preço médio do PRODUTO é reconstruído de venda ÷ litros e sai 6', () => {
        // A linha do produto não herda o null do bico: ela recalcula. Congelar isso
        // é o ponto — as duas colunas têm origens diferentes e podem divergir.
        expect(r.bicos[0].precoMedio).toBeNull();
        expect(r.produtos[0].precoMedio).toBe(6);
        expect(r.totais.precoMedio).toBe(6);
    });
});

describe('resumoPorProduto — divisor zero', () => {
    it('bico sem litros: participação 0 e preço médio null, sem NaN', () => {
        const r = resumoPorProduto(
            [
                bico({
                    bico: 'Bico 01',
                    produto: 'Gasolina',
                    litros: 1000,
                    venda: 6000,
                    precoMedio: 6,
                    custoMedio: 5,
                }),
                bico({ bico: 'Bico 04', produto: 'Etanol', litros: 0, venda: 0 }),
            ],
            DESPESA_LITRO,
            true
        );

        expect(r.produtos[1].produto).toBe('Etanol');
        expect(r.produtos[1].participacaoLitros).toBe(0);
        expect(r.produtos[1].precoMedio).toBeNull();
        expect(r.produtos[1].margem).toBe(0);
    });

    it('bico zerado não derruba a apuração do mês', () => {
        // `apurado || litros === 0`: bico que não vendeu não tem o que apurar.
        const r = resumoPorProduto(
            [
                bico({
                    bico: 'Bico 01',
                    produto: 'Gasolina',
                    litros: 1000,
                    venda: 6000,
                    precoMedio: 6,
                    custoMedio: 5,
                }),
                bico({ bico: 'Bico 04', produto: 'Etanol', litros: 0, venda: 0 }),
            ],
            DESPESA_LITRO,
            true
        );

        expect(r.bicos[1].apurado).toBe(false);
        expect(r.produtos[1].apurado).toBe(true);
        expect(r.apurado).toBe(true);
    });

    it('mês inteiro zerado: totais zerados e preço médio null', () => {
        const r = resumoPorProduto(
            [bico({ bico: 'Bico 04', produto: 'Etanol', litros: 0, venda: 0 })],
            DESPESA_LITRO,
            true
        );

        expect(r.totais.litros).toBe(0);
        expect(r.totais.venda).toBe(0);
        expect(r.totais.lucro).toBe(0);
        expect(r.totais.margem).toBe(0);
        expect(r.totais.precoMedio).toBeNull();
        expect(r.apurado).toBe(true);
    });
});

describe('resumoPorProduto — lista vazia', () => {
    const r = resumoPorProduto([], DESPESA_LITRO, true);

    it('não quebra e devolve estrutura vazia', () => {
        expect(r.bicos).toEqual([]);
        expect(r.produtos).toEqual([]);
    });

    it('totais zerados, preço médio null, despesa preservada', () => {
        expect(r.totais.litros).toBe(0);
        expect(r.totais.venda).toBe(0);
        expect(r.totais.lucro).toBe(0);
        expect(r.totais.margem).toBe(0);
        expect(r.totais.precoMedio).toBeNull();
        expect(r.totais.despesaPorLitro).toBe(0.5);
    });

    it('lista vazia conta como apurada — não há o que apurar', () => {
        expect(r.apurado).toBe(true);
    });
});

describe('resumoPorProduto — mês sem despesa lançada', () => {
    const r = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000,
                precoMedio: 6,
                custoMedio: 5,
            }),
        ],
        0,
        false
    );

    it('sem rateio o lucro dobra — é lucro BRUTO, e a flag avisa', () => {
        expect(r.bicos[0].lucroLitro).toBe(1);
        expect(r.totais.lucro).toBe(1000);
        expect(r.totais.margem).toBe(16.666666666666664);
        expect(r.totais.despesaPorLitro).toBe(0);
        expect(r.temDespesa).toBe(false);
    });
});

describe('resumoPorProduto — quantização em centavos', () => {
    // Venda e lucro caem em meio centavo; litros e preço médio não são dinheiro
    // final e mantêm a precisão cheia.
    const r = resumoPorProduto(
        [
            bico({
                bico: 'Bico 01',
                produto: 'Gasolina',
                litros: 1000,
                venda: 6000.005,
                precoMedio: 6.000005,
                custoMedio: 5,
            }),
        ],
        DESPESA_LITRO,
        true
    );

    it('venda do bico é quantizada em centavos', () => {
        expect(r.bicos[0].venda).toBe(6000.01);
    });

    it('lucro do bico é quantizado em centavos', () => {
        expect(r.bicos[0].lucro).toBe(500.01);
    });

    it('lucro POR LITRO não é dinheiro final e não quantiza', () => {
        expect(r.bicos[0].lucroLitro).toBe(0.5000049999999998);
    });

    it('margem do bico usa a venda CRUA, a do produto usa a quantizada', () => {
        // Detalhe real do módulo, e por isso congelado: a linha do bico calcula a
        // margem sobre `e.venda` antes do arredondamento, a linha do produto soma
        // vendas já quantizadas. As duas divergem na sexta casa.
        expect(r.bicos[0].margem).toBe(8.333493055422453);
        expect(r.produtos[0].margem).toBe(8.333486110856482);
    });

    it('preço médio do produto sai da venda já quantizada', () => {
        expect(r.produtos[0].precoMedio).toBe(6.0000100000000005);
    });
});

describe('resumoPorProduto — litros somados em mililitro inteiro', () => {
    it('1000,001 + 999,999 fecha em 2000 exato, sem ruído de float', () => {
        const r = resumoPorProduto(
            [
                bico({
                    bico: 'Bico 01',
                    produto: 'Gasolina',
                    litros: 1000.001,
                    venda: 6000,
                    precoMedio: 6,
                    custoMedio: 5,
                }),
                bico({
                    bico: 'Bico 02',
                    produto: 'Gasolina',
                    litros: 999.999,
                    venda: 6000,
                    precoMedio: 6,
                    custoMedio: 5,
                }),
            ],
            DESPESA_LITRO,
            true
        );

        expect(r.produtos[0].litros).toBe(2000);
        expect(r.totais.litros).toBe(2000);
        expect(r.produtos[0].precoMedio).toBe(6);
        expect(r.produtos[0].participacaoLitros).toBe(100);
    });
});

describe('resumoPorProduto — lucro negativo', () => {
    it('custo acima do preço vira prejuízo, não zero', () => {
        // Comprado a R$ 6,00 e vendido a R$ 6,00, com R$ 0,50/L de despesa.
        const r = resumoPorProduto(
            [
                bico({
                    bico: 'Bico 01',
                    produto: 'Gasolina',
                    litros: 1000,
                    venda: 6000,
                    precoMedio: 6,
                    custoMedio: 6,
                }),
            ],
            DESPESA_LITRO,
            true
        );

        expect(r.bicos[0].lucroLitro).toBe(-0.5);
        expect(r.bicos[0].lucro).toBe(-500);
        expect(r.totais.lucro).toBe(-500);
        expect(r.totais.margem).toBe(-8.333333333333332);
        expect(r.apurado).toBe(true);
    });
});
