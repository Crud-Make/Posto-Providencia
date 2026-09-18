/**
 * Regressão de fórmula — `troca-preco.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Esta suíte NÃO prova correção contra a planilha do posto: isso continua sendo
 * trabalho do golden master (`troca-preco.golden.spec.ts`), que lê `docs/data/`
 * e por isso só roda na máquina do dono.
 *
 * O que ela prova é o que falta no CI: que a fórmula NÃO MUDOU. Entradas
 * inventadas — combustíveis `alfa`/`beta`, 1000 litros/dia, R$ 5,00 → R$ 6,00 —
 * e saídas congeladas em literais escritos à mão a partir da execução real das
 * funções. Se um número aqui mudar, alguém mexeu numa fórmula de dinheiro, e o
 * golden local é quem decide se a mudança é conserto ou regressão.
 *
 * Nenhum valor abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import {
    trocasDePreco,
    estoqueNaVespera,
    impactoTrocaDePreco,
    totalGanhoPerdaCentavos,
    totalGanhoVendasCentavos,
    balancoTrocasCentavos,
    resumoPorDirecao,
    seriePrecoDiario,
    DIRECAO_TROCA,
    type LeituraPrecoDia,
    type CompraComData,
    type ReguaComData,
} from './troca-preco';

/** Uma leitura diária sintética. Padrão: combustível `alfa`. */
const leitura = (
    data: string,
    precoLitro: number | null,
    litrosVendidos: number,
    combustivel = 'alfa',
): LeituraPrecoDia => ({ data, combustivel, precoLitro, litrosVendidos });

// ── Cenário A: SUBIDA de R$ 5,00 para R$ 6,00, com régua e compra no mês ──
// Régua de 10.000 L em 01/03; compra de 2.000 L por R$ 8.000 (R$ 4,00/L) em
// 02/03; 1.000 L vendidos por dia. Véspera da troca = 10.000 + 2.000 − 1.000.
const LEITURAS_SUBIDA: readonly LeituraPrecoDia[] = [
    leitura('2026-03-01', 5.0, 1000),
    leitura('2026-03-02', 5.0, 1000),
    leitura('2026-03-03', 6.0, 1000),
    leitura('2026-03-04', 6.0, 1000),
];
const COMPRAS_SUBIDA: readonly CompraComData[] = [
    { combustivel: 'alfa', data: '2026-03-02', litros: 2000, valorTotal: 8000 },
];
const REGUAS_SUBIDA: readonly ReguaComData[] = [
    { combustivel: 'alfa', data: '2026-03-01', litros: 10000 },
];

// ── Cenário B: DESCIDA de R$ 6,00 para R$ 4,00, mês SEM compra ──
const LEITURAS_DESCIDA: readonly LeituraPrecoDia[] = [
    leitura('2026-04-10', 6.0, 500, 'beta'),
    leitura('2026-04-11', 4.0, 500, 'beta'),
];
const REGUAS_DESCIDA: readonly ReguaComData[] = [
    { combustivel: 'beta', data: '2026-04-09', litros: 2000 },
];

describe('DIRECAO_TROCA', () => {
    it('congela as duas direções e a ordem', () => {
        expect(DIRECAO_TROCA).toEqual(['subida', 'descida']);
    });
});

describe('trocasDePreco — detecção', () => {
    it('marca a troca no PRIMEIRO dia com o preço novo', () => {
        expect(trocasDePreco(LEITURAS_SUBIDA)).toEqual([
            { data: '2026-03-03', combustivel: 'alfa', precoAntigo: 5, precoNovo: 6 },
        ]);
    });

    it('descida também é troca', () => {
        expect(trocasDePreco(LEITURAS_DESCIDA)).toEqual([
            { data: '2026-04-11', combustivel: 'beta', precoAntigo: 6, precoNovo: 4 },
        ]);
    });

    it('preço único no período inteiro não gera troca nenhuma', () => {
        expect(trocasDePreco([leitura('2026-03-01', 6.0, 1000), leitura('2026-03-31', 6.0, 1000)])).toEqual([]);
    });

    it('lista vazia devolve lista vazia', () => {
        expect(trocasDePreco([])).toEqual([]);
    });

    it('dia sem preço registrado não quebra a corrente (mesmo preço dos dois lados = sem troca)', () => {
        expect(
            trocasDePreco([
                leitura('2026-03-01', 5.0, 1000),
                leitura('2026-03-02', null, 1000),
                leitura('2026-03-03', 5.0, 1000),
            ]),
        ).toEqual([]);
    });

    it('dia sem preço no meio: compara o último preço CONHECIDO com o próximo conhecido', () => {
        expect(
            trocasDePreco([
                leitura('2026-03-01', 5.0, 1000),
                leitura('2026-03-02', null, 1000),
                leitura('2026-03-03', 6.0, 1000),
            ]),
        ).toEqual([{ data: '2026-03-03', combustivel: 'alfa', precoAntigo: 5, precoNovo: 6 }]);
    });

    it('ordena por combustível e data, e cada combustível tem corrente própria', () => {
        expect(
            trocasDePreco([
                leitura('2026-03-03', 6.0, 1000, 'beta'),
                leitura('2026-03-01', 5.0, 1000, 'beta'),
                leitura('2026-03-01', 5.0, 1000),
                leitura('2026-03-02', 6.0, 1000),
                leitura('2026-03-03', 5.0, 1000),
            ]),
        ).toEqual([
            { data: '2026-03-02', combustivel: 'alfa', precoAntigo: 5, precoNovo: 6 },
            { data: '2026-03-03', combustivel: 'alfa', precoAntigo: 6, precoNovo: 5 },
            { data: '2026-03-03', combustivel: 'beta', precoAntigo: 5, precoNovo: 6 },
        ]);
    });

    it('bicos divergindo no mesmo dia: vale o preço de quem vendeu mais litros', () => {
        expect(
            trocasDePreco([
                leitura('2026-03-01', 5.0, 1000),
                leitura('2026-03-02', 6.0, 200),
                leitura('2026-03-02', 5.0, 900),
            ]),
        ).toEqual([]);
    });
});

describe('estoqueNaVespera — corte da corrente', () => {
    it('régua + compras − vendas, com os limites ESTRITOS (o dia da troca fica de fora)', () => {
        const compras: readonly CompraComData[] = [
            { combustivel: 'alfa', data: '2026-03-03', litros: 5000, valorTotal: 20000 }, // no dia da troca: fora
            { combustivel: 'alfa', data: '2026-03-02', litros: 2000, valorTotal: 8000 },
            { combustivel: 'beta', data: '2026-03-02', litros: 9999, valorTotal: 1 }, // outro combustível
        ];
        const vendas = [
            leitura('2026-03-02', 5.0, 1000),
            leitura('2026-03-03', 6.0, 7777), // no dia da troca: fora
            leitura('2026-03-02', 5.0, 500, 'beta'), // outro combustível
        ];
        expect(estoqueNaVespera('alfa', '2026-03-03', REGUAS_SUBIDA, compras, vendas)).toBe(11000);
    });

    it('sem régua anterior à troca devolve null — não apurável, nunca zero', () => {
        expect(estoqueNaVespera('alfa', '2026-03-03', [], COMPRAS_SUBIDA, LEITURAS_SUBIDA)).toBeNull();
    });

    it('régua no PRÓPRIO dia da troca não conta (precisa ser anterior)', () => {
        expect(
            estoqueNaVespera('alfa', '2026-03-03', [{ combustivel: 'alfa', data: '2026-03-03', litros: 10000 }], [], []),
        ).toBeNull();
    });

    it('com duas réguas anteriores, vale a mais recente', () => {
        expect(
            estoqueNaVespera(
                'alfa',
                '2026-03-05',
                [
                    { combustivel: 'alfa', data: '2026-03-01', litros: 10000 },
                    { combustivel: 'alfa', data: '2026-03-04', litros: 3000 },
                ],
                [],
                [leitura('2026-03-02', 5.0, 1000)], // anterior à régua nova: já não conta
            ),
        ).toBe(3000);
    });

    it('tanque exatamente zerado devolve 0 — zero apurado não é "não apurável"', () => {
        expect(
            estoqueNaVespera(
                'alfa',
                '2026-03-03',
                [{ combustivel: 'alfa', data: '2026-03-01', litros: 1000 }],
                [],
                [leitura('2026-03-02', 5.0, 1000)],
            ),
        ).toBe(0);
    });

    it('corrente NEGATIVA devolve null (#72): tanque negativo não existe', () => {
        expect(
            estoqueNaVespera(
                'alfa',
                '2026-03-03',
                [{ combustivel: 'alfa', data: '2026-03-01', litros: 1000 }],
                [],
                [leitura('2026-03-02', 5.0, 9000)],
            ),
        ).toBeNull();
    });
});

describe('impactoTrocaDePreco — subida com estoque e custo apuráveis', () => {
    const [impacto] = impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, REGUAS_SUBIDA);

    it('congela a linha inteira', () => {
        expect(impacto).toEqual({
            data: '2026-03-03',
            combustivel: 'alfa',
            precoAntigo: 5,
            precoNovo: 6,
            direcao: 'subida',
            precoAntigoDesde: '2026-03-01',
            diasComPrecoAntigo: 2,
            litrosNoTanque: 11000,
            custoMedioLitro: 4,
            margemAntigaLitro: 1,
            margemNovaLitro: 2,
            valorEstoqueAntigoCentavos: 5500000,
            valorEstoqueNovoCentavos: 6600000,
            ganhoPerdaCentavos: 1100000,
            litrosVendidosDesdeATroca: 2000,
            ganhoVendasCentavos: 200000,
            mediaLitrosDiaDesdeATroca: 1000,
            ganhoPorDiaCentavos: 100000,
            ritmoMensalCentavos: 3000000,
            lucroDiaAntigoCentavos: 100000,
            lucroDiaNovoCentavos: 200000,
        });
    });

    it('o custo NÃO entra no ganho: 11.000 L × Δ R$ 1,00 = R$ 11.000', () => {
        expect(impacto.ganhoPerdaCentavos).toBe(1100000);
    });

    it('valorEstoqueNovo FECHA com o ganho (é derivado, não arredondado à parte)', () => {
        expect(impacto.valorEstoqueNovoCentavos).toBe(
            (impacto.valorEstoqueAntigoCentavos ?? 0) + (impacto.ganhoPerdaCentavos ?? 0),
        );
    });
});

describe('impactoTrocaDePreco — descida em mês SEM compra', () => {
    const [impacto] = impactoTrocaDePreco(LEITURAS_DESCIDA, [], REGUAS_DESCIDA);

    it('congela a linha inteira: custo e margens null, dinheiro negativo', () => {
        expect(impacto).toEqual({
            data: '2026-04-11',
            combustivel: 'beta',
            precoAntigo: 6,
            precoNovo: 4,
            direcao: 'descida',
            precoAntigoDesde: '2026-04-10',
            diasComPrecoAntigo: 1,
            litrosNoTanque: 1500,
            custoMedioLitro: null,
            margemAntigaLitro: null,
            margemNovaLitro: null,
            valorEstoqueAntigoCentavos: 900000,
            valorEstoqueNovoCentavos: 600000,
            ganhoPerdaCentavos: -300000,
            litrosVendidosDesdeATroca: 500,
            ganhoVendasCentavos: -100000,
            mediaLitrosDiaDesdeATroca: 500,
            ganhoPorDiaCentavos: -100000,
            ritmoMensalCentavos: -3000000,
            lucroDiaAntigoCentavos: null,
            lucroDiaNovoCentavos: null,
        });
    });

    it('sem compra no mês o custo é null (não apurável), NUNCA 0', () => {
        expect(impacto.custoMedioLitro).toBeNull();
        expect(impacto.lucroDiaAntigoCentavos).toBeNull();
        expect(impacto.lucroDiaNovoCentavos).toBeNull();
    });
});

describe('impactoTrocaDePreco — ausência de troca e lista vazia', () => {
    it('mês de preço único não produz impacto nenhum', () => {
        expect(
            impactoTrocaDePreco([leitura('2026-03-01', 6.0, 1000), leitura('2026-03-31', 6.0, 1000)], [], []),
        ).toEqual([]);
    });

    it('entradas vazias devolvem lista vazia', () => {
        expect(impactoTrocaDePreco([], [], [])).toEqual([]);
    });
});

describe('impactoTrocaDePreco — casos de borda', () => {
    it('sem régua: estoque e valores null, mas as VENDAS desde a troca seguem apuradas', () => {
        const [impacto] = impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, []);
        expect(impacto.litrosNoTanque).toBeNull();
        expect(impacto.ganhoPerdaCentavos).toBeNull();
        expect(impacto.valorEstoqueAntigoCentavos).toBeNull();
        expect(impacto.valorEstoqueNovoCentavos).toBeNull();
        expect(impacto.ganhoVendasCentavos).toBe(200000);
        expect(impacto.custoMedioLitro).toBe(4);
    });

    it('nenhum litro vendido desde a troca: divisor zero vira média null, ganho de vendas 0', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2026-03-01', 5.0, 1000), leitura('2026-03-02', 6.0, 0)],
            [{ combustivel: 'alfa', data: '2026-03-01', litros: 1000, valorTotal: 4000 }],
            [{ combustivel: 'alfa', data: '2026-02-28', litros: 5000 }],
        );
        expect(impacto.litrosVendidosDesdeATroca).toBe(0);
        expect(impacto.ganhoVendasCentavos).toBe(0);
        expect(impacto.mediaLitrosDiaDesdeATroca).toBeNull();
        expect(impacto.ganhoPorDiaCentavos).toBeNull();
        expect(impacto.ritmoMensalCentavos).toBeNull();
        expect(impacto.lucroDiaAntigoCentavos).toBeNull();
        expect(impacto.lucroDiaNovoCentavos).toBeNull();
        expect(impacto.ganhoPerdaCentavos).toBe(500000);
    });

    it('compra com 0 litros no mês: divisor zero no custo médio vira null', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2026-03-01', 5.0, 1000), leitura('2026-03-02', 6.0, 1000)],
            [{ combustivel: 'alfa', data: '2026-03-01', litros: 0, valorTotal: 500 }],
            [],
        );
        expect(impacto.custoMedioLitro).toBeNull();
    });

    it('custo médio é do MÊS da troca: carga do mês anterior não entra', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2026-03-01', 5.0, 1000), leitura('2026-03-02', 6.0, 1000)],
            [{ combustivel: 'alfa', data: '2026-02-20', litros: 2000, valorTotal: 8000 }],
            [{ combustivel: 'alfa', data: '2026-02-28', litros: 5000 }],
        );
        expect(impacto.custoMedioLitro).toBeNull();
        expect(impacto.margemAntigaLitro).toBeNull();
        expect(impacto.litrosNoTanque).toBe(4000); // a carga de fevereiro segue na corrente
    });

    it('custo médio é PONDERADO por litro: 1000 L a R$ 3,00 + 3000 L a R$ 4,00 = R$ 3,75/L', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2026-03-01', 5.0, 1000), leitura('2026-03-02', 6.0, 1000)],
            [
                { combustivel: 'alfa', data: '2026-03-01', litros: 1000, valorTotal: 3000 },
                { combustivel: 'alfa', data: '2026-03-02', litros: 3000, valorTotal: 12000 },
            ],
            [],
        );
        expect(impacto.custoMedioLitro).toBe(3.75);
        expect(impacto.margemAntigaLitro).toBe(1.25);
        expect(impacto.margemNovaLitro).toBe(2.25);
    });

    it('quantização: Δpreço com drift de float (6,00 − 5,90) sai em centavos inteiros', () => {
        // 6.00 - 5.90 === 0.09999999999999964 em binário. 7000 L × esse Δ × 100
        // dá 69999.99..., e o resultado exibido tem de ser 70000 centavos.
        const leituras = [
            leitura('2026-03-01', 5.9, 1000),
            leitura('2026-03-02', 6.0, 1000),
            leitura('2026-03-03', 6.0, 1000),
            leitura('2026-03-04', 6.0, 1001),
        ];
        const [impacto] = impactoTrocaDePreco(leituras, [], [{ combustivel: 'alfa', data: '2026-02-28', litros: 8000 }]);
        expect(impacto.litrosNoTanque).toBe(7000);
        expect(impacto.ganhoPerdaCentavos).toBe(70000);
        expect(impacto.valorEstoqueAntigoCentavos).toBe(4130000);
        expect(impacto.valorEstoqueNovoCentavos).toBe(4200000);
        expect(impacto.litrosVendidosDesdeATroca).toBe(3001);
        expect(impacto.ganhoVendasCentavos).toBe(30010);
        expect(impacto.mediaLitrosDiaDesdeATroca).toBeCloseTo(1000.3333333333334, 10);
        expect(impacto.ganhoPorDiaCentavos).toBe(10003); // média não inteira, arredondada em centavos
        expect(impacto.ritmoMensalCentavos).toBe(300100);
    });

    it('vigência do preço antigo atravessa a virada do mês (fevereiro comum: 28 dias)', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2026-02-01', 5.0, 100), leitura('2026-03-01', 6.0, 100)],
            [],
            [],
        );
        expect(impacto.precoAntigoDesde).toBe('2026-02-01');
        expect(impacto.diasComPrecoAntigo).toBe(28);
    });

    it('e em ano bissexto conta 29 dias', () => {
        const [impacto] = impactoTrocaDePreco(
            [leitura('2024-02-01', 5.0, 100), leitura('2024-03-01', 6.0, 100)],
            [],
            [],
        );
        expect(impacto.precoAntigoDesde).toBe('2024-02-01');
        expect(impacto.diasComPrecoAntigo).toBe(29);
    });

    it('duas trocas no mesmo combustível: a segunda conta a vigência a partir da primeira', () => {
        const impactos = impactoTrocaDePreco(
            [leitura('2026-03-01', 5.0, 1000), leitura('2026-03-02', 6.0, 1000), leitura('2026-03-03', 5.0, 1000)],
            [],
            [{ combustivel: 'alfa', data: '2026-02-28', litros: 4000 }],
        );
        expect(impactos).toHaveLength(2);
        expect(impactos[0]).toMatchObject({
            data: '2026-03-02',
            direcao: 'subida',
            precoAntigoDesde: '2026-03-01',
            diasComPrecoAntigo: 1,
            litrosNoTanque: 3000,
            ganhoPerdaCentavos: 300000,
            ganhoVendasCentavos: 200000,
        });
        expect(impactos[1]).toMatchObject({
            data: '2026-03-03',
            direcao: 'descida',
            precoAntigoDesde: '2026-03-02',
            diasComPrecoAntigo: 1,
            litrosNoTanque: 2000,
            ganhoPerdaCentavos: -200000,
            ganhoVendasCentavos: -100000,
        });
    });
});

// Uma subida apurável (+R$ 11.000 de estoque, +R$ 2.000 de vendas) e uma
// descida apurável (−R$ 3.000 de estoque, −R$ 1.000 de vendas).
const IMPACTOS_MISTOS = [
    ...impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, REGUAS_SUBIDA),
    ...impactoTrocaDePreco(LEITURAS_DESCIDA, [], REGUAS_DESCIDA),
];

describe('totalGanhoPerdaCentavos', () => {
    it('soma o estoque parado das duas direções: 1.100.000 − 300.000', () => {
        expect(totalGanhoPerdaCentavos(IMPACTOS_MISTOS)).toBe(800000);
    });

    it('troca sem estoque apurável não entra na soma (null vira 0 só aqui)', () => {
        expect(totalGanhoPerdaCentavos(impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, []))).toBe(0);
    });

    it('lista vazia soma 0', () => {
        expect(totalGanhoPerdaCentavos([])).toBe(0);
    });
});

describe('totalGanhoVendasCentavos', () => {
    it('soma as vendas realizadas desde as trocas: 200.000 − 100.000', () => {
        expect(totalGanhoVendasCentavos(IMPACTOS_MISTOS)).toBe(100000);
    });

    it('lista vazia soma 0', () => {
        expect(totalGanhoVendasCentavos([])).toBe(0);
    });
});

describe('balancoTrocasCentavos', () => {
    it('separa em lucro e prejuízo as parcelas (estoque e vendas contam INDEPENDENTES)', () => {
        expect(balancoTrocasCentavos(IMPACTOS_MISTOS)).toEqual({
            lucroCentavos: 1300000, // 1.100.000 de estoque + 200.000 de vendas
            prejuizoCentavos: -400000, // −300.000 de estoque − 100.000 de vendas
            saldoCentavos: 900000,
        });
    });

    it('troca sem estoque apurável contribui só com a parcela de vendas', () => {
        expect(balancoTrocasCentavos(impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, []))).toEqual({
            lucroCentavos: 200000,
            prejuizoCentavos: 0,
            saldoCentavos: 200000,
        });
    });

    it('lista vazia devolve o balanço zerado', () => {
        expect(balancoTrocasCentavos([])).toEqual({
            lucroCentavos: 0,
            prejuizoCentavos: 0,
            saldoCentavos: 0,
        });
    });
});

describe('resumoPorDirecao', () => {
    it('decompõe o líquido em subidas × descidas', () => {
        expect(resumoPorDirecao(IMPACTOS_MISTOS)).toEqual({
            subidas: { quantidade: 1, totalCentavos: 1100000 },
            descidas: { quantidade: 1, totalCentavos: -300000 },
            liquidoCentavos: 800000,
        });
    });

    it('troca não apurável CONTA na quantidade e NÃO soma no total', () => {
        expect(resumoPorDirecao(impactoTrocaDePreco(LEITURAS_SUBIDA, COMPRAS_SUBIDA, []))).toEqual({
            subidas: { quantidade: 1, totalCentavos: 0 },
            descidas: { quantidade: 0, totalCentavos: 0 },
            liquidoCentavos: 0,
        });
    });

    it('lista vazia zera os dois lados', () => {
        expect(resumoPorDirecao([])).toEqual({
            subidas: { quantidade: 0, totalCentavos: 0 },
            descidas: { quantidade: 0, totalCentavos: 0 },
            liquidoCentavos: 0,
        });
    });
});

describe('seriePrecoDiario', () => {
    it('ordena por combustível e por dia, e o dia sem preço fica FORA (nunca vira zero)', () => {
        expect(
            seriePrecoDiario([
                leitura('2026-03-02', 6.0, 1000, 'beta'),
                leitura('2026-03-01', 5.0, 1000),
                leitura('2026-03-02', null, 1000),
                leitura('2026-03-03', 6.0, 200),
                leitura('2026-03-03', 5.0, 900), // dominante: vendeu mais
            ]),
        ).toEqual([
            {
                combustivel: 'alfa',
                pontos: [
                    { data: '2026-03-01', preco: 5 },
                    { data: '2026-03-03', preco: 5 },
                ],
            },
            { combustivel: 'beta', pontos: [{ data: '2026-03-02', preco: 6 }] },
        ]);
    });

    it('empate de litros no mesmo dia: a primeira linha vence', () => {
        expect(seriePrecoDiario([leitura('2026-03-01', 5.0, 1000), leitura('2026-03-01', 6.0, 1000)])).toEqual([
            { combustivel: 'alfa', pontos: [{ data: '2026-03-01', preco: 5 }] },
        ]);
    });

    it('combustível só com dias sem preço aparece com a série VAZIA, não com zeros', () => {
        expect(seriePrecoDiario([leitura('2026-03-01', null, 1000)])).toEqual([{ combustivel: 'alfa', pontos: [] }]);
    });

    it('lista vazia devolve lista vazia', () => {
        expect(seriePrecoDiario([])).toEqual([]);
    });
});
