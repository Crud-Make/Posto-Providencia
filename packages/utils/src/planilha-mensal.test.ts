import { describe, it, expect } from 'vitest';
import { planilhaMensal, type EntradaPlanilhaMensal } from './planilha-mensal';

/**
 * Os valores abaixo são os que a tela abre — e não foram inventados: são o mês
 * 01/2026 da planilha real. Os litros fecham em 46.843,062 e a despesa de
 * R$ 22.158,46 sobre eles dá o custo do litro de 0,4730361 que
 * `resumo-compra` documenta célula a célula. Se algum destes números mudar, a
 * tela deixou de abrir na planilha que o dono conhece.
 */
const ENTRADA: EntradaPlanilhaMensal = {
    bicos: [
        { bico: 'G.C. Bico 01', produto: 'gc', inicial: 1716778.963, fechamento: 1739504.522 },
        { bico: 'G.A. Bico 02', produto: 'ga', inicial: 652606.432, fechamento: 659969.153 },
        { bico: 'Etanol Bico 03', produto: 'et', inicial: 410611.222, fechamento: 417822.073 },
        { bico: 'Ds.500 Bico 04', produto: 'ds', inicial: 355874.923, fechamento: 359136.623 },
        { bico: 'G.C. Bico 05', produto: 'gc', inicial: 8549.042, fechamento: 12969.192 },
        { bico: 'G.C. Bico 06', produto: 'gc', inicial: 4566.411, fechamento: 6428.492 },
    ],
    produtos: [
        { produto: 'gc', preco: 6.48, compraLitros: 31000, compraValor: 165700, estoqueAnterior: 7392, estoqueTanque: 5672 },
        { produto: 'ga', preco: 6.48, compraLitros: 5000, compraValor: 26555, estoqueAnterior: 4124, estoqueTanque: 1937 },
        { produto: 'et', preco: 4.98, compraLitros: 8000, compraValor: 32800, estoqueAnterior: 1752, estoqueTanque: 2631 },
        { produto: 'ds', preco: 6.38, compraLitros: 3000, compraValor: 16140, estoqueAnterior: 2415, estoqueTanque: 2034 },
    ],
    despesasDoMes: 22158.46,
};

describe('planilhaMensal', () => {
    it('apura os litros do bico como salto do encerrante, ao mililitro', () => {
        const r = planilhaMensal(ENTRADA);

        // 1739504.522 − 1716778.963 em float cru devolve 22725.558999999998.
        expect(r.venda.bicos[0].litros).toBe(22725.559);
        expect(r.venda.totais.litros).toBe(46843.062);
    });

    it('rateia a despesa pelos litros VENDIDOS, não pelos comprados', () => {
        const r = planilhaMensal(ENTRADA);

        // 22158.46 ÷ 46843.062. Pelos 47.000 comprados daria 0,4714566 — outro
        // piso de venda para todo produto, e sem nada na tela avisando.
        expect(r.custoPorLitro).toBeCloseTo(0.4730361, 7);
        expect(r.compra.despesaPorLitro).toBe(r.custoPorLitro);
        expect(r.venda.totais.despesaPorLitro).toBe(r.custoPorLitro);
    });

    it('encadeia média de compra → piso de venda → lucro do litro', () => {
        const r = planilhaMensal(ENTRADA);
        const gc = r.compra.produtos.find((p) => p.produto === 'gc');

        expect(gc?.mediaLitro).toBeCloseTo(165700 / 31000, 7); // 5,3451613
        expect(gc?.valorParaVenda).toBeCloseTo(5.3451613 + 0.4730361, 6);
        // lucro_lt = preço − piso. O bico 01 vende a 6,48.
        expect(r.venda.bicos[0].lucroLitro).toBeCloseTo(6.48 - 5.8181974, 6);
    });

    it('agrega Produto Vendido por produto, não por bico', () => {
        const r = planilhaMensal(ENTRADA);
        const gc = r.venda.produtos.find((p) => p.produto === 'gc');

        // Bicos 01, 05 e 06 vendem a mesma gasolina comum: um total só.
        expect(gc?.bicos).toHaveLength(3);
        expect(gc?.litros).toBe(22725.559 + 4420.15 + 1862.081);
        expect(gc?.participacaoLitros).toBeCloseTo((29007.79 / 46843.062) * 100, 6);
    });

    it('apura a perda do tanque com o sinal da planilha — negativo é PERDA', () => {
        const r = planilhaMensal(ENTRADA);
        const gc = r.estoque.produtos.find((p) => p.produto === 'gc');

        // 7392 + 31000 − 29007,79 = 9384,21 teóricos contra 5672 medidos.
        expect(gc?.estoqueTeorico).toBe(9384.21);
        // Exatamente −3.712,21. Escrito à mão de propósito: `5672 - 9384.21` em
        // float devolve −3712.209999999999, e é justamente esse ruído que o
        // módulo evita somando em mililitro inteiro.
        expect(gc?.percaOuSobra).toBe(-3712.21);

        const percaGc = r.percas.find((p) => p.produto === 'gc');
        expect(percaGc?.litros).toBeLessThan(0);
        // O percentual do agregado mantém o sinal; o de `resumo-estoque` é módulo.
        expect(percaGc?.percentual).toBeLessThan(0);
    });

    it('separa margem bruta de lucro líquido pela despesa do mês', () => {
        const r = planilhaMensal(ENTRADA);

        // A distributiva: a margem bruta menos a despesa rateada em todo litro
        // vendido é o lucro líquido. Se os dois números não fecharem assim, um
        // dos blocos está usando outro custo do litro.
        expect(r.margemBruta - r.custoPorLitro * r.venda.totais.litros).toBeCloseTo(
            r.lucroLiquido,
            1
        );
        expect(r.margemBruta).toBeGreaterThan(r.lucroLiquido);
    });

    it('não apura lucro de produto sem compra lançada, em vez de assumir custo zero', () => {
        const semCompra = planilhaMensal({
            ...ENTRADA,
            produtos: ENTRADA.produtos.map((p) =>
                p.produto === 'ds' ? { ...p, compraLitros: 0, compraValor: 0 } : p
            ),
        });

        const ds = semCompra.venda.bicos.find((b) => b.produto === 'ds');
        expect(ds?.apurado).toBe(false);
        expect(ds?.lucroLitro).toBeNull();
        // Combustível de graça inflaria a margem bruta; ele fica de fora dela.
        expect(semCompra.venda.apurado).toBe(false);
    });

    it('trata mês sem venda sem estourar em divisão por zero', () => {
        const vazio = planilhaMensal({
            bicos: [{ bico: 'G.C. Bico 01', produto: 'gc', inicial: 100, fechamento: 100 }],
            produtos: [
                { produto: 'gc', preco: 6.48, compraLitros: 0, compraValor: 0, estoqueAnterior: 0, estoqueTanque: 0 },
            ],
            despesasDoMes: 1000,
        });

        expect(vazio.custoPorLitro).toBe(0);
        expect(vazio.lucroPorLitro).toBeNull();
        expect(vazio.percaPercentual).toBeNull();
    });
});
