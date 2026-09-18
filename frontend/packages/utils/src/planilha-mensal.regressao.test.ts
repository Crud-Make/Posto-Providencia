/**
 * Regressão de fórmula — `planilha-mensal.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * O golden master (`planilha-mensal.golden.spec.ts`) continua sendo quem prova
 * que os três blocos batem célula a célula com a planilha real; ele lê
 * `docs/data/` e só roda na máquina do dono. Esta suíte roda no CI e prova outra
 * coisa: que a corrente de contas NÃO MUDOU.
 *
 * O posto inventado: dois produtos, "Verde" a R$ 6,00/L e "Azul" a R$ 4,00/L,
 * três bicos, encerrantes redondos (10.000 → 11.000) e despesa de R$ 1.000,00 no
 * mês. Nenhum litro, preço ou rótulo vem do posto real.
 *
 * O que fica travado, na ordem em que a planilha monta:
 *
 *     litros          = fechamento − inicial, com piso em zero
 *     custo_do_litro  = despesas_do_mês ÷ litros_VENDIDOS
 *     média_lt        = compra_R$ ÷ compra_LT
 *     lucro_lt        = preço − média_lt − custo_do_litro
 *     estoque_teórico = estoque_anterior + compra_LT − vendido
 *     perca           = estoque_tanque − estoque_teórico   (negativo = PERDA)
 */
import { describe, it, expect } from 'vitest';
import { planilhaMensal, type EntradaPlanilhaMensal } from './planilha-mensal';

const MES_CHEIO: EntradaPlanilhaMensal = {
    bicos: [
        { bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 11000 },
        { bico: 'Bico 02', produto: 'Verde', inicial: 20000, fechamento: 20500 },
        { bico: 'Bico 03', produto: 'Azul', inicial: 30000, fechamento: 30500 },
    ],
    produtos: [
        {
            produto: 'Verde',
            preco: 6,
            compraLitros: 2000,
            compraValor: 10000,
            estoqueAnterior: 4000,
            estoqueTanque: 4400,
        },
        {
            produto: 'Azul',
            preco: 4,
            compraLitros: 1000,
            compraValor: 3000,
            estoqueAnterior: 1000,
            estoqueTanque: 1500,
        },
    ],
    despesasDoMes: 1000,
};

describe('planilhaMensal — o mês cheio, os três blocos coerentes', () => {
    const r = planilhaMensal(MES_CHEIO);

    it('rateia a despesa pelos litros VENDIDOS (1000 ÷ 2000 = R$ 0,50/L)', () => {
        // Litro COMPRADO foram 3000 — usá-lo daria R$ 0,3333 e moveria o piso
        // de venda de todo produto em silêncio.
        expect(r.custoPorLitro).toBe(0.5);
        expect(r.venda.totais.despesaPorLitro).toBe(0.5);
        expect(r.compra.despesaPorLitro).toBe(0.5);
    });

    it('bloco Venda por bico: litros, venda e lucro do litro', () => {
        expect(r.venda.bicos).toEqual([
            {
                bico: 'Bico 01',
                produto: 'Verde',
                inicial: 10000,
                fechamento: 11000,
                litros: 1000,
                precoMedio: 6,
                venda: 6000,
                lucroLitro: 0.5, // 6 − 5 − 0,5
                lucro: 500,
                margem: 8.333333333333332,
                apurado: true,
            },
            {
                bico: 'Bico 02',
                produto: 'Verde',
                inicial: 20000,
                fechamento: 20500,
                litros: 500,
                precoMedio: 6,
                venda: 3000,
                lucroLitro: 0.5,
                lucro: 250,
                margem: 8.333333333333332,
                apurado: true,
            },
            {
                bico: 'Bico 03',
                produto: 'Azul',
                inicial: 30000,
                fechamento: 30500,
                litros: 500,
                precoMedio: 4,
                venda: 2000,
                lucroLitro: 0.5, // 4 − 3 − 0,5
                lucro: 250,
                margem: 12.5,
                apurado: true,
            },
        ]);
    });

    it('bloco Venda por produto: os dois bicos de Verde somam numa linha só', () => {
        expect(r.venda.produtos).toEqual([
            {
                produto: 'Verde',
                bicos: ['Bico 01', 'Bico 02'],
                litros: 1500,
                venda: 9000,
                lucro: 750,
                margem: 8.333333333333332,
                precoMedio: 6,
                participacaoLitros: 75,
                apurado: true,
            },
            {
                produto: 'Azul',
                bicos: ['Bico 03'],
                litros: 500,
                venda: 2000,
                lucro: 250,
                margem: 12.5,
                precoMedio: 4,
                participacaoLitros: 25,
                apurado: true,
            },
        ]);
    });

    it('bloco Venda, totais', () => {
        expect(r.venda.totais).toEqual({
            litros: 2000,
            venda: 11000,
            lucro: 1000,
            margem: 9.090909090909092,
            precoMedio: 5.5,
            despesaPorLitro: 0.5,
        });
        expect(r.venda.apurado).toBe(true);
        expect(r.venda.temDespesa).toBe(true);
    });

    it('bloco Compra: média do litro e piso de venda', () => {
        expect(r.compra.produtos).toEqual([
            {
                produto: 'Verde',
                litros: 2000,
                valor: 10000,
                mediaLitro: 5,
                valorParaVenda: 5.5, // 5 + 0,5
                percentualDespesa: 9.090909090909092,
            },
            {
                produto: 'Azul',
                litros: 1000,
                valor: 3000,
                mediaLitro: 3,
                valorParaVenda: 3.5,
                percentualDespesa: 14.285714285714285,
            },
        ]);
        expect(r.compra.totais).toEqual({
            produto: 'Total',
            litros: 3000,
            valor: 13000,
            mediaLitro: 4.333333333333333,
            valorParaVenda: 4.833333333333333,
            percentualDespesa: 10.344827586206899,
        });
        expect(r.compra.temDespesa).toBe(true);
    });

    it('bloco Estoque: teórico contra medido, com o sinal da planilha', () => {
        expect(r.estoque.produtos).toEqual([
            {
                produto: 'Verde',
                estoqueAnterior: 4000,
                litrosComprados: 2000,
                litrosVendidos: 1500,
                compraEEstoque: 6000,
                estoqueTeorico: 4500,
                estoqueMedido: 4400,
                percaOuSobra: -100, // negativo = PERDA
                percentualSobreVenda: 6.666666666666667,
            },
            {
                produto: 'Azul',
                estoqueAnterior: 1000,
                litrosComprados: 1000,
                litrosVendidos: 500,
                compraEEstoque: 2000,
                estoqueTeorico: 1500,
                estoqueMedido: 1500,
                percaOuSobra: 0,
                percentualSobreVenda: 0,
            },
        ]);
        expect(r.estoque.temPerda).toBe(true);
        expect(r.estoque.temProdutoSemMedicao).toBe(false);
    });

    it('agregados do cabeçalho: margem bruta, lucro líquido e perda com sinal', () => {
        expect(r.despesasDoMes).toBe(1000);
        // 1500 L × (6 − 5) + 500 L × (4 − 3) = 2000, ANTES da despesa.
        expect(r.margemBruta).toBe(2000);
        expect(r.lucroLiquido).toBe(1000);
        expect(r.lucroPorLitro).toBe(0.5);
        expect(r.percaTotal).toBe(-100);
        expect(r.percaPercentual).toBe(-5);
        expect(r.produtosComEstoqueImpossivel).toEqual([]);
    });

    it('a perda por produto vem COM sinal, ao contrário da magnitude do bloco', () => {
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: -100, percentual: -6.666666666666667, impossivel: false },
            { produto: 'Azul', litros: 0, percentual: 0, impossivel: false },
        ]);
        // O bloco Estoque devolve a magnitude; aqui o sinal é o que importa.
        expect(r.estoque.produtos[0].percentualSobreVenda).toBe(6.666666666666667);
    });
});

describe('planilhaMensal — vendaBruta preenchida manda no lugar de litros × preço', () => {
    const r = planilhaMensal({
        ...MES_CHEIO,
        bicos: [
            { bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 11000, vendaBruta: 5800 },
            MES_CHEIO.bicos[1],
            MES_CHEIO.bicos[2],
        ],
    });

    it('a venda do bico é o dinheiro que entrou, não o modelo da planilha', () => {
        expect(r.venda.bicos[0].venda).toBe(5800); // 1000 L × R$ 6,00 daria 6000
        expect(r.venda.totais.venda).toBe(10800);
        expect(r.venda.totais.precoMedio).toBe(5.4);
    });

    it('o lucro e a margem bruta continuam saindo do preço digitado', () => {
        expect(r.venda.bicos[0].lucro).toBe(500);
        expect(r.margemBruta).toBe(2000);
        expect(r.venda.bicos[0].margem).toBe(8.620689655172415);
    });
});

describe('planilhaMensal — produto SEM compra no período', () => {
    const r = planilhaMensal({
        bicos: [
            { bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 11000 },
            { bico: 'Bico 03', produto: 'Azul', inicial: 30000, fechamento: 30500 },
        ],
        produtos: [
            {
                produto: 'Verde',
                preco: 6,
                compraLitros: 2000,
                compraValor: 10000,
                estoqueAnterior: 4000,
                estoqueTanque: 5000,
            },
            {
                produto: 'Azul',
                preco: 4,
                compraLitros: 0,
                compraValor: 0,
                estoqueAnterior: 1000,
                estoqueTanque: 500,
            },
        ],
        despesasDoMes: 750,
    });

    it('custo desconhecido aparece como NULL, nunca como zero', () => {
        expect(r.compra.produtos[1].mediaLitro).toBe(null);
        expect(r.compra.produtos[1].valorParaVenda).toBe(null);
        expect(r.venda.bicos[1].lucroLitro).toBe(null);
    });

    it('lucro não apurável vira 0 marcado como NÃO apurado, não "lucrou zero"', () => {
        expect(r.venda.bicos[1].lucro).toBe(0);
        expect(r.venda.bicos[1].apurado).toBe(false);
        expect(r.venda.produtos[1].apurado).toBe(false);
        expect(r.venda.apurado).toBe(false);
    });

    it('o bico com compra continua apurando normalmente', () => {
        expect(r.custoPorLitro).toBe(0.5); // 750 ÷ 1500 L
        expect(r.venda.bicos[0].lucroLitro).toBe(0.5);
        expect(r.venda.bicos[0].lucro).toBe(500);
        expect(r.venda.bicos[0].apurado).toBe(true);
    });

    it('margem bruta soma só o apurável — combustível sem custo não sai de graça', () => {
        // Só os 1000 L de Verde × (6 − 5). Os 500 L de Azul ficam de fora.
        expect(r.margemBruta).toBe(1000);
        expect(r.lucroLiquido).toBe(500);
        expect(r.lucroPorLitro).toBe(0.3333333333333333);
    });

    it('percentualDespesa do produto sem compra é 0, não NaN', () => {
        expect(r.compra.produtos[1].percentualDespesa).toBe(0);
    });
});

describe('planilhaMensal — tanque NÃO medido', () => {
    const r = planilhaMensal({
        ...MES_CHEIO,
        produtos: [MES_CHEIO.produtos[0], { ...MES_CHEIO.produtos[1], estoqueTanque: null }],
    });

    it('produto sem medição vem com perda null, nunca zero', () => {
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: -100, percentual: -6.666666666666667, impossivel: false },
            { produto: 'Azul', litros: null, percentual: null, impossivel: false },
        ]);
    });

    it('o total inteiro vira null — perda pela metade é pior que total nenhum', () => {
        expect(r.percaTotal).toBe(null);
        expect(r.percaPercentual).toBe(null);
        expect(r.estoque.totais.estoqueMedido).toBe(null);
        expect(r.estoque.totais.percaOuSobra).toBe(null);
        expect(r.estoque.temProdutoSemMedicao).toBe(true);
    });
});

describe('planilhaMensal — estoque teórico NEGATIVO é impossível físico', () => {
    const r = planilhaMensal({
        bicos: [{ bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 15000 }],
        produtos: [
            {
                produto: 'Verde',
                preco: 6,
                compraLitros: 1000,
                compraValor: 5000,
                estoqueAnterior: 1000,
                estoqueTanque: 500,
            },
        ],
        despesasDoMes: 1000,
    });

    it('vender 5000 L tendo 2000 L marca impossivel e anula a perda', () => {
        expect(r.estoque.produtos[0].estoqueTeorico).toBe(-3000);
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: null, percentual: null, impossivel: true },
        ]);
    });

    it('a tela recebe QUAIS produtos, não só um travessão', () => {
        expect(r.produtosComEstoqueImpossivel).toEqual(['Verde']);
        expect(r.percaTotal).toBe(null);
        expect(r.percaPercentual).toBe(null);
    });
});

describe('planilhaMensal — encerrante não lançado NÃO é combustível sumido', () => {
    const r = planilhaMensal({
        bicos: [{ bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 10000 }],
        produtos: [
            {
                produto: 'Verde',
                preco: 6,
                compraLitros: 1000,
                compraValor: 5000,
                estoqueAnterior: 1000,
                estoqueTanque: 1200,
            },
        ],
        despesasDoMes: 1000,
    });

    it('zero litro vendido com tanque medido devolve perda null, não uma perda do tamanho do mês', () => {
        expect(r.estoque.produtos[0].estoqueTeorico).toBe(2000);
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: null, percentual: null, impossivel: false },
        ]);
        expect(r.percaTotal).toBe(null);
        expect(r.percaPercentual).toBe(null);
    });

    it('sem litro vendido o rateio da despesa é 0 e o lucro por litro é null', () => {
        expect(r.custoPorLitro).toBe(0); // divisor zero, não Infinity
        expect(r.lucroPorLitro).toBe(null);
        expect(r.margemBruta).toBe(0);
        expect(r.lucroLiquido).toBe(0);
    });
});

describe('planilhaMensal — mês parado e legítimo (estoque não se mexeu)', () => {
    const r = planilhaMensal({
        bicos: [{ bico: 'Bico 01', produto: 'Verde', inicial: 10000, fechamento: 10000 }],
        produtos: [
            {
                produto: 'Verde',
                preco: 6,
                compraLitros: 0,
                compraValor: 0,
                estoqueAnterior: 1000,
                estoqueTanque: 1000,
            },
        ],
        despesasDoMes: 0,
    });

    it('perda exatamente 0 continua APURÁVEL — não é o caso do encerrante ausente', () => {
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: 0, percentual: null, impossivel: false },
        ]);
        expect(r.percaTotal).toBe(0);
        expect(r.percaPercentual).toBe(null); // sem litro vendido, não há sobre o quê
    });

    it('despesa zerada derruba temDespesa, para a tela não ler bruto como líquido', () => {
        expect(r.venda.temDespesa).toBe(false);
        expect(r.compra.temDespesa).toBe(false);
        expect(r.custoPorLitro).toBe(0);
    });

    it('sem venda, participação é 0 e preço médio é null', () => {
        expect(r.venda.produtos[0].participacaoLitros).toBe(0);
        expect(r.venda.totais.precoMedio).toBe(null);
    });
});

describe('planilhaMensal — entrada vazia', () => {
    const r = planilhaMensal({ bicos: [], produtos: [], despesasDoMes: 0 });

    it('não quebra e não inventa número', () => {
        expect(r.venda.bicos).toEqual([]);
        expect(r.venda.produtos).toEqual([]);
        expect(r.compra.produtos).toEqual([]);
        expect(r.venda.totais).toEqual({
            litros: 0,
            venda: 0,
            lucro: 0,
            margem: 0,
            precoMedio: null,
            despesaPorLitro: 0,
        });
        expect(r.custoPorLitro).toBe(0);
        expect(r.margemBruta).toBe(0);
        expect(r.lucroLiquido).toBe(0);
        expect(r.lucroPorLitro).toBe(null);
        expect(r.despesasDoMes).toBe(0);
    });

    it('sem produto nenhum, o total de perda é null — não existe "perdi zero"', () => {
        expect(r.percas).toEqual([]);
        expect(r.percaTotal).toBe(null);
        expect(r.percaPercentual).toBe(null);
        expect(r.produtosComEstoqueImpossivel).toEqual([]);
    });

    it('lista vazia NÃO é "tudo medido": o total de estoque vem sem medição', () => {
        expect(r.estoque.totais.estoqueMedido).toBe(null);
        expect(r.estoque.totais.percaOuSobra).toBe(null);
        expect(r.estoque.temPerda).toBe(false);
        expect(r.estoque.temProdutoSemMedicao).toBe(false);
    });
});

describe('planilhaMensal — encerrante invertido não encolhe o mês por baixo', () => {
    const r = planilhaMensal({
        bicos: [
            { bico: 'Bico 01', produto: 'Verde', inicial: 11000, fechamento: 10000 },
            { bico: 'Bico 02', produto: 'Verde', inicial: 20000, fechamento: 21000 },
        ],
        produtos: [
            {
                produto: 'Verde',
                preco: 6,
                compraLitros: 2000,
                compraValor: 10000,
                estoqueAnterior: 4000,
                estoqueTanque: 5000,
            },
        ],
        despesasDoMes: 1000,
    });

    it('o bico invertido entra com 0 L e R$ 0,00, nunca com litro negativo', () => {
        expect(r.venda.bicos[0].litros).toBe(0);
        expect(r.venda.bicos[0].venda).toBe(0);
        expect(r.venda.bicos[1].litros).toBe(1000);
    });

    it('o denominador do rateio é só o que sobrou (1000 ÷ 1000 = R$ 1,00/L)', () => {
        expect(r.venda.totais.litros).toBe(1000);
        expect(r.custoPorLitro).toBe(1);
        expect(r.margemBruta).toBe(1000);
    });
});

describe('planilhaMensal — quantização', () => {
    it('litros são arredondados ao mililitro antes de qualquer conta', () => {
        const r = planilhaMensal({
            bicos: [{ bico: 'Bico 01', produto: 'Verde', inicial: 1000.125, fechamento: 2000.875 }],
            produtos: [
                {
                    produto: 'Verde',
                    preco: 6,
                    compraLitros: 1000,
                    compraValor: 5000,
                    estoqueAnterior: 2000,
                    estoqueTanque: 2000,
                },
            ],
            despesasDoMes: 1000,
        });
        expect(r.venda.bicos[0].litros).toBe(1000.75);
        expect(r.venda.bicos[0].venda).toBe(6004.5);
        expect(r.custoPorLitro).toBe(0.9992505620784412);
        expect(r.estoque.produtos[0].estoqueTeorico).toBe(1999.25);
        expect(r.percas).toEqual([
            { produto: 'Verde', litros: 0.75, percentual: 0.0749437921558831, impossivel: false },
        ]);
    });

    it('a despesa devolvida passa por emCentavos; o rateio NÃO é quantizado', () => {
        const r = planilhaMensal({ ...MES_CHEIO, despesasDoMes: 1000.005 });
        expect(r.despesasDoMes).toBe(1000.01);
        // O rateio não é dinheiro final: mantém a precisão inteira.
        expect(r.custoPorLitro).toBe(0.5000025);
    });
});
