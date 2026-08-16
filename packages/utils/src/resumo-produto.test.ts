/**
 * Casos de borda do resumo por produto — o que o golden não cobre.
 *
 * O golden prova a fórmula contra os 7 meses reais. Aqui ficam as situações que
 * a planilha não tem porque nunca aconteceram nela, mas que o banco tem todo dia
 * durante o replay: mês sem despesa lançada, bico parado, mês vazio.
 */
import { describe, it, expect } from 'vitest';
import { resumoPorProduto, type EntradaBicoMes } from './resumo-produto';

/** Base de janeiro/2026 simplificada: dois bicos de comum e um de etanol. */
const entradas: EntradaBicoMes[] = [
    {
        bico: 'G,C. Bico 01',
        produto: 'G,Comum.',
        inicial: 1_716_778.963,
        fechamento: 1_739_504.522,
        litros: 22_725.559,
        venda: 147_261.62,
        precoMedio: 6.48,
        custoMedio: 5.345,
    },
    {
        bico: 'G,C, Bico 05',
        produto: 'G,Comum.',
        inicial: 8_549.042,
        fechamento: 12_969.192,
        litros: 4_420.15,
        venda: 28_642.57,
        precoMedio: 6.48,
        custoMedio: 5.345,
    },
    {
        bico: 'Etanol,Bico 03',
        produto: 'Etanol.',
        inicial: 410_611.222,
        fechamento: 417_822.073,
        litros: 7_210.851,
        venda: 35_910.04,
        precoMedio: 4.98,
        custoMedio: 4.1,
    },
];

describe('resumoPorProduto', () => {
    it('agrupa os bicos do mesmo produto numa linha só', () => {
        const r = resumoPorProduto(entradas, 0.473, true);

        expect(r.bicos).toHaveLength(3);
        expect(r.produtos).toHaveLength(2);

        const comum = r.produtos.find((p) => p.produto === 'G,Comum.')!;
        expect(comum.bicos).toEqual(['G,C. Bico 01', 'G,C, Bico 05']);
        expect(comum.litros).toBeCloseTo(27_145.709, 3);
    });

    it('calcula participação sobre os litros do mês, não sobre a venda', () => {
        const r = resumoPorProduto(entradas, 0.473, true);
        const total = 22_725.559 + 4_420.15 + 7_210.851;

        const comum = r.produtos.find((p) => p.produto === 'G,Comum.')!;
        const etanol = r.produtos.find((p) => p.produto === 'Etanol.')!;

        expect(comum.participacaoLitros).toBeCloseTo((27_145.709 / total) * 100, 6);
        expect(etanol.participacaoLitros).toBeCloseTo((7_210.851 / total) * 100, 6);
        expect(comum.participacaoLitros + etanol.participacaoLitros).toBeCloseTo(100, 6);
    });

    it('desconta a despesa rateada do lucro de cada bico', () => {
        const semDespesa = resumoPorProduto(entradas, 0, false);
        const comDespesa = resumoPorProduto(entradas, 0.473, true);

        // A diferença é exatamente o rateio × litros do mês — nunca mais que isso.
        const litros = 22_725.559 + 4_420.15 + 7_210.851;
        expect(semDespesa.totais.lucro - comDespesa.totais.lucro).toBeCloseTo(
            0.473 * litros,
            1
        );
    });

    it('marca temDespesa=false quando o mês não tem despesa lançada', () => {
        const r = resumoPorProduto(entradas, 0, false);

        // O lucro exibido nesse caso é BRUTO. A flag é o que impede a tela de
        // apresentá-lo como se fosse o que sobrou no bolso do dono.
        expect(r.temDespesa).toBe(false);
        expect(r.totais.despesaPorLitro).toBe(0);
    });

    it('trata bico parado no mês sem poluir o resultado', () => {
        const comBicoParado: EntradaBicoMes[] = [
            ...entradas,
            {
                bico: 'G,C. Bico 06',
                produto: 'G,Comum.',
                inicial: 4_566.411,
                fechamento: 4_566.411,
                litros: 0,
                venda: 0,
                precoMedio: null,
                custoMedio: 5.345,
            },
        ];

        const r = resumoPorProduto(comBicoParado, 0.473, true);
        const parado = r.bicos.find((b) => b.bico === 'G,C. Bico 06')!;

        expect(parado.lucro).toBe(0);
        expect(parado.lucroLitro).toBeNull();
        expect(parado.margem).toBe(0);

        // Bico parado não pode alterar a participação dos outros.
        const semParado = resumoPorProduto(entradas, 0.473, true);
        expect(r.totais.litros).toBeCloseTo(semParado.totais.litros, 3);
    });

    it('não apura lucro de produto sem compra no mês, em vez de fingir custo zero', () => {
        const semCusto: EntradaBicoMes[] = [
            { ...entradas[0], custoMedio: null },
            entradas[2],
        ];

        const r = resumoPorProduto(semCusto, 0.473, true);
        const comum = r.bicos.find((b) => b.bico === 'G,C. Bico 01')!;

        expect(comum.apurado).toBe(false);
        expect(comum.lucro).toBe(0);
        expect(comum.lucroLitro).toBeNull();

        // O etanol tem custo e continua apurado — a falta de um não derruba o outro.
        const etanol = r.bicos.find((b) => b.bico === 'Etanol,Bico 03')!;
        expect(etanol.apurado).toBe(true);
        expect(etanol.lucro).toBeGreaterThan(0);

        // Mas o total precisa se declarar incompleto.
        expect(r.apurado).toBe(false);
        expect(r.produtos.find((p) => p.produto === 'G,Comum.')!.apurado).toBe(false);
        expect(r.produtos.find((p) => p.produto === 'Etanol.')!.apurado).toBe(true);
    });

    it('devolve zeros, e não NaN, quando não há nenhuma venda', () => {
        const r = resumoPorProduto([], 0, false);

        expect(r.bicos).toEqual([]);
        expect(r.produtos).toEqual([]);
        expect(r.totais.litros).toBe(0);
        expect(r.totais.venda).toBe(0);
        expect(r.totais.lucro).toBe(0);
        expect(r.totais.margem).toBe(0);
        expect(r.totais.precoMedio).toBeNull();
    });

    it('preserva a ordem dos produtos pela ordem dos bicos', () => {
        const r = resumoPorProduto(entradas, 0.473, true);
        expect(r.produtos.map((p) => p.produto)).toEqual(['G,Comum.', 'Etanol.']);
    });
});
