import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../supabase', () => ({
    supabase: { from: fromMock },
}));

vi.mock('./estoque.service', () => ({
    estoqueService: { getAll: vi.fn() },
}));

vi.mock('./despesa.service', () => ({
    despesaService: { getByMonth: vi.fn() },
}));

vi.mock('./configuracao.service', () => ({
    configuracaoService: { getValorNumerico: vi.fn() },
}));

import { aggregatorService } from './aggregator.service';
import { estoqueService } from './estoque.service';
import { despesaService } from './despesa.service';
import { configuracaoService } from './configuracao.service';

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

describe('aggregatorService.fetchProfitabilityData — regressão do bug de limite superior de mês', () => {
    beforeEach(() => {
        vi.mocked(estoqueService.getAll).mockResolvedValue({
            success: true,
            data: [{
                id: 1,
                combustivel_id: 10,
                custo_medio: 3,
                combustivel: { nome: 'Gasolina', codigo: 'G', preco_venda: 5.5, cor: 'red' },
            }],
            timestamp: new Date().toISOString(),
        } as never);

        vi.mocked(despesaService.getByMonth).mockResolvedValue({
            success: true,
            data: [{ valor: 50 }],
            timestamp: new Date().toISOString(),
        } as never);

        vi.mocked(configuracaoService.getValorNumerico).mockResolvedValue({
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

    it('não inclui leituras do mês seguinte ao consultar rentabilidade de um mês fechado', async () => {
        const result = await aggregatorService.fetchProfitabilityData(2026, 1);

        expect(result.success).toBe(true);
        if (!result.success) return;

        const item = result.data.find(i => i.combustivelId === 10);
        expect(item?.volumeVendido).toBe(100);
        expect(item?.receitaBruta).toBe(550);
    });
});
