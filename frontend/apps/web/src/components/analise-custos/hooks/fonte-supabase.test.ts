import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * Movido de `services/api/aggregator.service.test.ts` com as contas (25/09/2026): a Análise de
 * Custos saiu do aggregator para `carregar-analise.ts`. Os cenários e os números são os mesmos;
 * aqui roda o caminho Supabase (sem `VITE_API_URL` nem `VITE_API_CUSTOS`).
 */
const { fromMock, servicos } = vi.hoisted(() => ({
    fromMock: vi.fn(),
    servicos: {
        estoqueService: { getAll: vi.fn() },
        despesaService: { getByMonth: vi.fn() },
        compraService: { getByDateRange: vi.fn() },
        configuracaoService: { getValorNumerico: vi.fn() },
    },
}));

vi.mock('../../../services/supabase', () => ({
    supabase: { from: fromMock },
}));
vi.mock('../../../services/api', () => servicos);

import { carregarAnalise } from './carregar-analise';

const { estoqueService, despesaService, compraService, configuracaoService } = servicos;

afterEach(() => {
    vi.unstubAllEnvs();
});

interface LeituraFake {
    data: string;
    litros_vendidos: number;
    valor_total: number;
    bico: { combustivel_id: number };
}

/** Builder fake da query do Supabase: aplica `.gte`/`.lte` de verdade sobre o array,
 *  simulando o filtro que o Postgres faria — prova que o range é respeitado, não só chamado. */
function buildLeituraQuery(rows: LeituraFake[]) {
    let filtrado = rows;
    const builder = {
        select: () => builder,
        gte: (coluna: keyof LeituraFake, valor: string) => {
            filtrado = filtrado.filter(r => String(r[coluna]) >= valor);
            return builder;
        },
        lte: (coluna: keyof LeituraFake, valor: string) => {
            filtrado = filtrado.filter(r => String(r[coluna]) <= valor);
            return builder;
        },
        eq: () => builder,
        then: (resolve: (v: { data: LeituraFake[]; error: null }) => void) => resolve({ data: filtrado, error: null }),
    };
    return builder;
}

describe('Análise de Custos pelo Supabase — regressão do bug de limite superior de mês', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubEnv('VITE_API_CUSTOS', '');
        estoqueService.getAll.mockResolvedValue({
            success: true,
            data: [{
                id: 1,
                combustivel_id: 10,
                custo_medio: 9.99,
                combustivel: { nome: 'Gasolina', codigo: 'G', preco_venda: 5.5, cor: 'red' },
            }],
            timestamp: new Date().toISOString(),
        } as never);

        despesaService.getByMonth.mockResolvedValue({
            success: true,
            data: [{ valor: 50 }],
            timestamp: new Date().toISOString(),
        } as never);

        // [03/09] O custo vem da compra do mês (R$ 3,00/L), não mais do carimbo
        // `custo_medio` do estoque — que fica no fixture acima só para provar que
        // é ignorado.
        compraService.getByDateRange.mockResolvedValue({
            success: true,
            data: [{ combustivel_id: 10, quantidade_litros: 1000, valor_total: 3000 }],
            timestamp: new Date().toISOString(),
        } as never);

        configuracaoService.getValorNumerico.mockResolvedValue({
            success: true,
            data: 0.45,
            timestamp: new Date().toISOString(),
        });

        fromMock.mockReturnValue(buildLeituraQuery([
            // dentro de janeiro/2026 — deve entrar no cálculo.
            { data: '2026-01-15', litros_vendidos: 100, valor_total: 550, bico: { combustivel_id: 10 } },
            // fevereiro/2026 — vazava pro cálculo de janeiro antes do fix (sem `.lte`).
            { data: '2026-02-01', litros_vendidos: 1000, valor_total: 5500, bico: { combustivel_id: 10 } },
        ]));
    });

    it('mês sem despesa lançada rateia 0 — nunca o fallback fixo de 0,45', async () => {
        // Zero despesas no mês: o rateio real (despesas ÷ litros) é 0. O código
        // antigo trocava esse 0 pela config `despesa_operacional_litro` (semeada
        // com 0,45) e todo dashboard mostrava lucro calculado com número
        // inventado — com o banco em replay, era o estado normal, não a exceção.
        despesaService.getByMonth.mockResolvedValue({
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
        } as never);

        const result = await carregarAnalise(2026, 1, 1);

        expect(result.isOk()).toBe(true);
        if (result.isErr()) return;

        const item = result.value.itens.find(i => i.combustivelId === 10);
        expect(item?.despOperacional).toBe(0);
        // custoTotalL = custo do produto, sem parcela operacional inventada
        expect(item?.custoTotalL).toBe(3);
        // lucro = 550 − 100 × 3 — não 550 − 100 × 3,45
        expect(item?.lucroTotal).toBe(250);
        // e a config nunca é consultada como fonte de custo
        expect(configuracaoService.getValorNumerico).not.toHaveBeenCalled();
    });

    it('não inclui leituras do mês seguinte ao consultar rentabilidade de um mês fechado', async () => {
        const result = await carregarAnalise(2026, 1, 1);

        expect(result.isOk()).toBe(true);
        if (result.isErr()) return;

        const item = result.value.itens.find(i => i.combustivelId === 10);
        expect(item?.volumeVendido).toBe(100);
        expect(item?.receitaBruta).toBe(550);
    });

    it('produto vendido sem compra no mês fica fora dos itens e é nomeado em produtosSemCompra', async () => {
        compraService.getByDateRange.mockResolvedValue({
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
        } as never);

        const result = await carregarAnalise(2026, 1, 1);

        expect(result.isOk()).toBe(true);
        if (result.isErr()) return;

        // Antes: custo 0 → lucro = receita inteira (550), o produto "mais lucrativo" da tela.
        expect(result.value.itens).toEqual([]);
        expect(result.value.produtosSemCompra).toEqual(['Gasolina']);
    });
});
