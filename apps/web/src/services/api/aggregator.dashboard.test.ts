import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../supabase', () => ({
    supabase: { from: fromMock },
}));

vi.mock('./estoque.service', () => ({ estoqueService: { getAll: vi.fn() } }));
vi.mock('./frentista.service', () => ({ frentistaService: { getAll: vi.fn() } }));
vi.mock('./formaPagamento.service', () => ({ formaPagamentoService: { getAll: vi.fn() } }));
vi.mock('./leitura.service', () => ({ leituraService: { getByDateRange: vi.fn() } }));
vi.mock('./fechamentoFrentista.service', () => ({ fechamentoFrentistaService: { getByDate: vi.fn() } }));
vi.mock('./despesa.service', () => ({ despesaService: { getByMonth: vi.fn() } }));
vi.mock('./configuracao.service', () => ({ configuracaoService: { getValorNumerico: vi.fn() } }));
vi.mock('./compra.service', () => ({ compraService: { getByDateRange: vi.fn() } }));

import { aggregatorService } from './aggregator.service';
import { estoqueService } from './estoque.service';
import { frentistaService } from './frentista.service';
import { formaPagamentoService } from './formaPagamento.service';
import { leituraService } from './leitura.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { despesaService } from './despesa.service';
import { configuracaoService } from './configuracao.service';
import { compraService } from './compra.service';

const GASOLINA_COMUM = { id: 1, codigo: 'GC', nome: 'Gasolina Comum', cor: '#22c55e', preco_venda: 6, preco_custo: 5 };
const ETANOL = { id: 2, codigo: 'ET', nome: 'Etanol', cor: '#eab308', preco_venda: 4, preco_custo: 3 };

/**
 * Estoque em tanque, propositalmente MUITO diferente do que foi vendido.
 * É a separação que torna o teste capaz de ficar vermelho: se o gráfico plotar
 * estoque, sai 8.000/5.000; se plotar venda, sai 1.500/300.
 */
const ESTOQUE = [
    { id: 1, combustivel_id: 1, combustivel: GASOLINA_COMUM, quantidade_atual: 8000, capacidade_tanque: 15000 },
    { id: 2, combustivel_id: 2, combustivel: ETANOL, quantidade_atual: 5000, capacidade_tanque: 10000 },
];

/** Leituras do período: 1.500 L de gasolina (1.000 + 500) e 300 L de etanol. */
const LEITURAS = [
    { id: 1, litros_vendidos: 1000, valor_total: 6000, bico: { id: 1, combustivel: GASOLINA_COMUM } },
    { id: 2, litros_vendidos: 500, valor_total: 3000, bico: { id: 2, combustivel: GASOLINA_COMUM } },
    { id: 3, litros_vendidos: 300, valor_total: 1200, bico: { id: 3, combustivel: ETANOL } },
];

const ok = <T>(data: T) => ({ success: true as const, data, timestamp: '2026-01-15T00:00:00.000Z' });

describe('aggregatorService.fetchDashboardData — fonte do gráfico "Volume Vendido"', () => {
    beforeEach(() => {
        // Query crua de Leitura dentro de despesaOperacionalMensal (não passa por service).
        const builder = {
            select: () => builder,
            gte: () => builder,
            lte: () => builder,
            eq: () => builder,
            then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
        };
        fromMock.mockImplementation(() => builder);

        vi.mocked(estoqueService.getAll).mockResolvedValue(ok(ESTOQUE) as never);
        vi.mocked(frentistaService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(formaPagamentoService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(leituraService.getByDateRange).mockResolvedValue(ok(LEITURAS) as never);
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue(ok([]) as never);
        vi.mocked(despesaService.getByMonth).mockResolvedValue(ok([]) as never);
        vi.mocked(configuracaoService.getValorNumerico).mockResolvedValue(ok(0.45) as never);
        vi.mocked(compraService.getByDateRange).mockResolvedValue(ok([]) as never);
    });

    it('plota os litros VENDIDOS no período, não o que sobrou no tanque', async () => {
        const result = await aggregatorService.fetchDashboardData('2026-01-15', '2026-01-15');

        expect(result.success).toBe(true);
        if (!result.success) return;

        const gasolina = result.data.fuelData.find(f => f.name === 'Gasolina Comum');
        const etanol = result.data.fuelData.find(f => f.name === 'Etanol');

        expect(gasolina?.volume).toBe(1500);
        expect(etanol?.volume).toBe(300);
    });

    it('mantém o total do gráfico coerente com o KPI de volume total', async () => {
        const result = await aggregatorService.fetchDashboardData('2026-01-15', '2026-01-15');

        expect(result.success).toBe(true);
        if (!result.success) return;

        const somaGrafico = result.data.fuelData.reduce((acc, f) => acc + f.volume, 0);
        expect(somaGrafico).toBe(result.data.kpis.totalVolume);
    });
});
