import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerDashboardDaApi, paraInsumosDeAgregacao, type DashboardDaApi } from './dashboard.api';

/** O JSON de exemplo do Design Doc `agregacao.md` §5, como a API devolve. */
const respostaDaApi: DashboardDaApi = {
    periodo: { inicio: '2026-01-01', fim: '2026-01-31' },
    produtos: [
        {
            combustivel_id: 1,
            produto: 'GASOLINA COMUM',
            litros_vendidos: '12345.678',
            receita: '74074.07',
            compras: { litros: '15000.000', valor_total: '82500.00' },
        },
    ],
    rateio: {
        mes_civil: { inicio: '2026-01-01', fim: '2026-01-31' },
        despesas_total: '22158.46',
        litros_vendidos: '45678.901',
    },
};

const CODIGOS: ReadonlyMap<number, string> = new Map([
    [1, 'GC'],
    [3, 'ET'],
]);

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('paraInsumosDeAgregacao', () => {
    it('converte o JSON do §5 em número e reshape, sem nenhuma conta', () => {
        expect(paraInsumosDeAgregacao(respostaDaApi, CODIGOS)).toEqual({
            porCombustivel: [
                { combustivel: { id: 1, nome: 'GASOLINA COMUM', codigo: 'GC' }, litros: 12345.678, valor: 74074.07 },
            ],
            totalLitros: 12345.678,
            totalVendas: 74074.07,
            compras: [{ combustivel_id: 1, quantidade_litros: 15000, valor_total: 82500 }],
            rateio: { despesasTotal: 22158.46, litros: 45678.901 },
            janelaDoRateio: { inicio: '2026-01-01', fim: '2026-01-31' },
        });
    });

    it('soma litros e receita de todos os produtos vendidos; produto sem cadastro fica sem código', () => {
        const lido: DashboardDaApi = {
            ...respostaDaApi,
            produtos: [
                ...respostaDaApi.produtos,
                {
                    combustivel_id: 9,
                    produto: 'QUEROSENE',
                    litros_vendidos: '100.000',
                    receita: '500.00',
                    compras: { litros: '0.000', valor_total: '0.00' },
                },
            ],
        };

        const insumos = paraInsumosDeAgregacao(lido, CODIGOS);

        expect(insumos.totalLitros).toBe(12345.678 + 100);
        expect(insumos.totalVendas).toBe(74074.07 + 500);
        expect(insumos.porCombustivel[1]?.combustivel).toEqual({ id: 9, nome: 'QUEROSENE', codigo: undefined });
        expect(insumos.compras).toEqual([
            { combustivel_id: 1, quantidade_litros: 15000, valor_total: 82500 },
            { combustivel_id: 9, quantidade_litros: 0, valor_total: 0 },
        ]);
    });

    it('produto só com compra na janela fica fora do gráfico, mas a compra dele entra', () => {
        const lido: DashboardDaApi = {
            ...respostaDaApi,
            produtos: [
                ...respostaDaApi.produtos,
                {
                    combustivel_id: 3,
                    produto: 'ETANOL',
                    litros_vendidos: '0.000',
                    receita: '0.00',
                    compras: { litros: '8000.000', valor_total: '32800.00' },
                },
            ],
        };

        const insumos = paraInsumosDeAgregacao(lido, CODIGOS);

        expect(insumos.porCombustivel.map((v) => v.combustivel.id)).toEqual([1]);
        expect(insumos.totalLitros).toBe(12345.678);
        expect(insumos.compras.map((c) => c.combustivel_id)).toEqual([1, 3]);
    });
});

describe('lerDashboardDaApi', () => {
    it('chama a rota do posto com inicio e fim na query, na base configurada, sem barra dobrada', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerDashboardDaApi(1, '2026-01-01', '2026-01-31');

        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:8000/api/postos/1/dashboard?inicio=2026-01-01&fim=2026-01-31',
            expect.anything(),
        );
        expect(lido.isOk() && lido.value).toEqual(respostaDaApi);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerDashboardDaApi(1, '2026-01-01', '2026-01-31');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('status de erro vira erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Not Found' }, 404);

        const lido = await lerDashboardDaApi(99, '2026-01-01', '2026-01-31');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 404 });
    });

    it('receita como número em vez de string decimal é resposta fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({
            ...respostaDaApi,
            produtos: [{ ...respostaDaApi.produtos[0], receita: 74074.07 }],
        });

        const lido = await lerDashboardDaApi(1, '2026-01-01', '2026-01-31');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('corpo com envelope data (que este endpoint não usa) é resposta fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: respostaDaApi });

        const lido = await lerDashboardDaApi(1, '2026-01-01', '2026-01-31');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('falha de rede vira erro de rede', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));

        const lido = await lerDashboardDaApi(1, '2026-01-01', '2026-01-31');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'rede', detalhe: 'Failed to fetch' });
    });
});
