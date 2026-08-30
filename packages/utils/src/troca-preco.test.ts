import { describe, it, expect } from 'vitest';
import {
    trocasDePreco,
    estoqueNaVespera,
    impactoTrocaDePreco,
    totalGanhoPerdaCentavos,
    resumoPorDirecao,
    type LeituraPrecoDia,
} from './troca-preco';

const dia = (data: string, precoLitro: number | null, litrosVendidos = 100, combustivel = 'gc'): LeituraPrecoDia =>
    ({ data, combustivel, precoLitro, litrosVendidos });

describe('trocasDePreco', () => {
    it('detecta a transição no primeiro dia com o preço novo', () => {
        const trocas = trocasDePreco([dia('2026-01-05', 6.28), dia('2026-01-06', 6.28), dia('2026-01-07', 6.48)]);
        expect(trocas).toEqual([{ data: '2026-01-07', combustivel: 'gc', precoAntigo: 6.28, precoNovo: 6.48 }]);
    });

    it('mês de preço único não tem troca', () => {
        expect(trocasDePreco([dia('2026-01-01', 6.28), dia('2026-01-31', 6.28)])).toEqual([]);
    });

    it('dia sem preço registrado não vira troca nem quebra a corrente', () => {
        const trocas = trocasDePreco([dia('2026-01-01', 6.28), dia('2026-01-02', null), dia('2026-01-03', 6.28)]);
        expect(trocas).toEqual([]);
    });

    it('bicos divergindo no mesmo dia: vale o preço de quem vendeu mais', () => {
        const trocas = trocasDePreco([
            dia('2026-01-01', 6.28, 500),
            dia('2026-01-02', 6.48, 900), // dominante
            dia('2026-01-02', 6.28, 100),
        ]);
        expect(trocas).toEqual([{ data: '2026-01-02', combustivel: 'gc', precoAntigo: 6.28, precoNovo: 6.48 }]);
    });

    it('combustíveis não se misturam', () => {
        const trocas = trocasDePreco([
            dia('2026-01-01', 6.28, 100, 'gc'), dia('2026-01-02', 6.48, 100, 'gc'),
            dia('2026-01-01', 4.58, 100, 'et'), dia('2026-01-02', 4.58, 100, 'et'),
        ]);
        expect(trocas).toHaveLength(1);
        expect(trocas[0].combustivel).toBe('gc');
    });

    it('queda de preço também é troca', () => {
        const [troca] = trocasDePreco([dia('2026-05-15', 7.38), dia('2026-05-16', 7.18)]);
        expect(troca.precoAntigo).toBe(7.38);
        expect(troca.precoNovo).toBe(7.18);
    });
});

describe('estoqueNaVespera', () => {
    const reguas = [{ combustivel: 'gc', data: '2026-01-01', litros: 7392 }];
    const compras = [{ combustivel: 'gc', data: '2026-01-03', litros: 5000, valorTotal: 26_726 }];
    const vendas = [dia('2026-01-02', 6.28, 1000), dia('2026-01-06', 6.28, 500), dia('2026-01-07', 6.48, 999_999)];

    it('régua + compras − vendas, tudo ANTES do dia da troca', () => {
        // 7392 + 5000 − (1000 + 500); a venda de 07/01 (dia da troca) fica fora.
        expect(estoqueNaVespera('gc', '2026-01-07', reguas, compras, vendas)).toBe(10_892);
    });

    it('compra e venda do próprio dia da régua não contam duas vezes', () => {
        const comprasNoDia = [{ combustivel: 'gc', data: '2026-01-01', litros: 5000, valorTotal: 1 }];
        expect(estoqueNaVespera('gc', '2026-01-02', reguas, comprasNoDia, [])).toBe(7392);
    });

    it('sem régua anterior à troca → null, nunca zero', () => {
        expect(estoqueNaVespera('gc', '2026-01-01', reguas, compras, vendas)).toBeNull();
        expect(estoqueNaVespera('et', '2026-01-07', reguas, compras, vendas)).toBeNull();
    });

    it('usa a régua mais recente antes da troca', () => {
        const duas = [...reguas, { combustivel: 'gc', data: '2026-01-05', litros: 9000 }];
        expect(estoqueNaVespera('gc', '2026-01-07', duas, compras, [dia('2026-01-06', 6.28, 500)])).toBe(8500);
    });
});

describe('impactoTrocaDePreco', () => {
    const leituras = [dia('2026-01-06', 6.28, 500), dia('2026-01-07', 6.48, 500)];
    const reguas = [{ combustivel: 'gc', data: '2026-01-05', litros: 2000 }];
    const compras = [{ combustivel: 'gc', data: '2026-01-20', litros: 31_000, valorTotal: 165_700 }];

    it('ganho = litros × Δpreço, em centavos; custo médio só contexto', () => {
        const [impacto] = impactoTrocaDePreco(leituras, compras, reguas);
        // (2000 − 500) × (6.48 − 6.28) = 1500 × 0.20 = R$ 300,00
        expect(impacto.litrosNoTanque).toBe(1500);
        expect(impacto.ganhoPerdaCentavos).toBe(30_000);
        expect(impacto.custoMedioLitro).toBeCloseTo(165_700 / 31_000, 9);
    });

    it('queda de preço dá ganho negativo (deixou de ganhar sobre o estoque)', () => {
        const queda = [dia('2026-05-15', 7.38, 100), dia('2026-05-16', 7.18, 100)];
        const regua = [{ combustivel: 'gc', data: '2026-05-14', litros: 1000 }];
        const [impacto] = impactoTrocaDePreco(queda, [], regua);
        // A venda de 15/05 (100 L) entra na corrente: (1000 − 100) × −0,20 = −R$ 180,00.
        expect(impacto.litrosNoTanque).toBe(900);
        expect(impacto.ganhoPerdaCentavos).toBe(-18_000);
        expect(impacto.custoMedioLitro).toBeNull(); // mês sem compra
    });

    it('sem régua: troca aparece, impacto fica null', () => {
        const [impacto] = impactoTrocaDePreco(leituras, compras, []);
        expect(impacto.litrosNoTanque).toBeNull();
        expect(impacto.ganhoPerdaCentavos).toBeNull();
    });

    it('total soma só o apurável', () => {
        const impactos = impactoTrocaDePreco(leituras, compras, reguas);
        expect(totalGanhoPerdaCentavos(impactos)).toBe(30_000);
        expect(totalGanhoPerdaCentavos(impactoTrocaDePreco(leituras, compras, []))).toBe(0);
    });
});

describe('direção, margem e valorização do estoque (#70)', () => {
    const leituras = [dia('2026-01-06', 6.28, 500), dia('2026-01-07', 6.48, 500)];
    const reguas = [{ combustivel: 'gc', data: '2026-01-05', litros: 2000 }];
    const compras = [{ combustivel: 'gc', data: '2026-01-20', litros: 31_000, valorTotal: 165_700 }];

    it('subida: direção, margem antes/depois e estoque valorizado', () => {
        const [i] = impactoTrocaDePreco(leituras, compras, reguas);
        const custo = 165_700 / 31_000;
        expect(i.direcao).toBe('subida');
        expect(i.margemAntigaLitro).toBeCloseTo(6.28 - custo, 9);
        expect(i.margemNovaLitro).toBeCloseTo(6.48 - custo, 9);
        // 1500 L × 6,28 = R$ 9.420,00; + ganho de R$ 300,00 = R$ 9.720,00 (= 1500 × 6,48)
        expect(i.valorEstoqueAntigoCentavos).toBe(942_000);
        expect(i.valorEstoqueNovoCentavos).toBe(972_000);
    });

    it('descida: direção certa e a margem cai junto', () => {
        const queda = [dia('2026-05-15', 7.38, 100), dia('2026-05-16', 7.18, 100)];
        const regua = [{ combustivel: 'gc', data: '2026-05-14', litros: 1000 }];
        const compraMai = [{ combustivel: 'gc', data: '2026-05-02', litros: 32_000, valorTotal: 190_810 }];
        const [i] = impactoTrocaDePreco(queda, compraMai, regua);
        expect(i.direcao).toBe('descida');
        expect(i.margemNovaLitro).toBeCloseTo((i.margemAntigaLitro ?? 0) - 0.20, 9);
    });

    it('valor novo − valor antigo FECHA com o ganho/perda, mesmo com litros quebrados', () => {
        const leiturasQuebradas = [dia('2026-01-06', 6.28, 499.445), dia('2026-01-07', 6.48, 500)];
        const [i] = impactoTrocaDePreco(leiturasQuebradas, compras, reguas);
        expect(i.valorEstoqueNovoCentavos).not.toBeNull();
        expect((i.valorEstoqueNovoCentavos ?? 0) - (i.valorEstoqueAntigoCentavos ?? 0)).toBe(i.ganhoPerdaCentavos ?? NaN);
    });

    it('sem compra no mês: margens null, nunca zero', () => {
        const [i] = impactoTrocaDePreco(leituras, [], reguas);
        expect(i.margemAntigaLitro).toBeNull();
        expect(i.margemNovaLitro).toBeNull();
    });

    it('sem régua: valorização null, margens continuam apuráveis', () => {
        const [i] = impactoTrocaDePreco(leituras, compras, []);
        expect(i.valorEstoqueAntigoCentavos).toBeNull();
        expect(i.valorEstoqueNovoCentavos).toBeNull();
        expect(i.margemAntigaLitro).not.toBeNull();
    });
});

describe('resumoPorDirecao', () => {
    const reguas = [
        { combustivel: 'gc', data: '2026-01-01', litros: 2000 },
        { combustivel: 'et', data: '2026-01-01', litros: 1000 },
    ];
    const leituras = [
        dia('2026-01-02', 6.28, 100, 'gc'), dia('2026-01-03', 6.48, 100, 'gc'), // subida
        dia('2026-01-02', 4.98, 100, 'et'), dia('2026-01-03', 4.58, 100, 'et'), // descida
    ];

    it('separa subidas de descidas e o líquido bate com o total', () => {
        const impactos = impactoTrocaDePreco(leituras, [], reguas);
        const resumo = resumoPorDirecao(impactos);
        // gc: (2000−100) × +0,20 = +R$ 380 · et: (1000−100) × −0,40 = −R$ 360
        expect(resumo.subidas).toEqual({ quantidade: 1, totalCentavos: 38_000 });
        expect(resumo.descidas).toEqual({ quantidade: 1, totalCentavos: -36_000 });
        expect(resumo.liquidoCentavos).toBe(totalGanhoPerdaCentavos(impactos));
    });

    it('troca sem régua conta na quantidade mas não no total', () => {
        const impactos = impactoTrocaDePreco([dia('2026-01-02', 6.28), dia('2026-01-03', 6.48)], [], []);
        const resumo = resumoPorDirecao(impactos);
        expect(resumo.subidas).toEqual({ quantidade: 1, totalCentavos: 0 });
        expect(resumo.liquidoCentavos).toBe(0);
    });
});
