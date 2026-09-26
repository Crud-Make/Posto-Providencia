import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Qualquer toque no client do Supabase reprova: com o login pela API (`VITE_API_LOGIN=1`) não
 * existe sessão dele, e o Relatório Diário tem de abrir inteiro sem ele (#103).
 */
const { toqueNoSupabase, servicos } = vi.hoisted(() => ({
    toqueNoSupabase: vi.fn(),
    servicos: {
        fechamentoService: { getByDate: vi.fn() },
        leituraService: { getByDate: vi.fn() },
        despesaService: { getAll: vi.fn() },
        compraService: { getByDateRange: vi.fn() },
    },
}));
vi.mock('../../../services/supabase', () => ({
    supabase: new Proxy(
        {},
        {
            get: (_alvo, chave) => {
                toqueNoSupabase(String(chave));
                throw new Error(`Supabase tocado: ${String(chave)}`);
            },
        },
    ),
}));
// O caminho Supabase da tela passa por estes quatro services; aqui eles devolvem o MESMO dia que
// a API falsa, para a paridade ser medida sobre o mesmo dado.
vi.mock('../../../services/api', () => servicos);

import { carregarInsumos } from './useRelatorioDiario';
import { montarRelatorio } from './montar-relatorio';
import { relatorioDiarioPelaApi } from '../../../services/api/relatorio-diario.api';

const DIA = '2026-09-20';

/*
 * O dia 20/09/2026 do posto 1, nas duas formas. Dois fechamentos FECHADO (sem turno e turno 2),
 * gravados por dois usuários; Gasolina 672,569 L a 6,28 e S10 300 L a 6,50; compras do mês:
 * Gasolina 3000 L/16.800 + 1000 L/5.800 (custo 5,65) e S10 1000 L/5.000 (custo 5,00); despesas
 * 150,00 e 49,90 no dia (e 300,00 no dia 21, que não entra).
 */
const RELATORIO_DA_API = {
    data: DIA,
    fechamentos: [
        { id: 10, data: '2026-09-20T00:00:00Z', status: 'FECHADO', total_vendas: '4000.00', diferenca: '-5.00', turno_id: null, usuario_nome: 'Ana' },
        { id: 11, data: '2026-09-20T00:00:00Z', status: 'FECHADO', total_vendas: '2173.73', diferenca: '-5.25', turno_id: 2, usuario_nome: 'Bia' },
    ],
    despesas: [
        { id: 1, descricao: 'Energia', categoria: 'Energia Elétrica', valor: '150.00', data: DIA, status: 'pago', data_pagamento: DIA, observacoes: 'conta de agosto' },
        { id: 2, descricao: 'Lanche', categoria: null, valor: '49.90', data: DIA, status: 'pendente', data_pagamento: null, observacoes: null },
    ],
};

const LEITURAS_DA_API = {
    data: [
        { id: 7, data: '2026-09-20T00:00:00Z', bico_id: 2, combustivel_id: 2, turno_id: null, leitura_inicial: '500.000', leitura_final: '800.000', litros_vendidos: '300.000', preco_litro: '6.50', valor_total: '1950.00' },
        { id: 5, data: '2026-09-20T00:00:00Z', bico_id: 1, combustivel_id: 1, turno_id: null, leitura_inicial: '1000.000', leitura_final: '1672.569', litros_vendidos: '672.569', preco_litro: '6.28', valor_total: '4223.73' },
    ],
};

const DASHBOARD_DA_API = {
    periodo: { inicio: DIA, fim: DIA },
    produtos: [
        { combustivel_id: 2, produto: 'Diesel S10', litros_vendidos: '300.000', receita: '1950.00', compras: { litros: '1000.000', valor_total: '5000.00' } },
        { combustivel_id: 1, produto: 'Gasolina Comum', litros_vendidos: '672.569', receita: '4223.73', compras: { litros: '4000.000', valor_total: '22600.00' } },
    ],
    rateio: { mes_civil: { inicio: '2026-09-01', fim: '2026-09-30' }, despesas_total: '499.90', litros_vendidos: '972.569' },
    leituras: [],
};

const ok = <T,>(data: T) => ({ success: true as const, data });

/** O mesmo dia como o PostgREST o entrega aos services do caminho Supabase. */
function supabaseDoMesmoDia(): void {
    servicos.fechamentoService.getByDate.mockResolvedValue(ok([
        { id: 10, turno_id: null, total_vendas: 4000, diferenca: -5, status: 'FECHADO', usuario: { id: '1', nome: 'Ana' } },
        { id: 11, turno_id: 2, total_vendas: 2173.73, diferenca: -5.25, status: 'FECHADO', usuario: { id: '2', nome: 'Bia' } },
    ]));
    servicos.leituraService.getByDate.mockResolvedValue(ok([
        { id: 5, turno_id: null, leitura_inicial: 1000, leitura_final: 1672.569, preco_litro: 6.28, valor_total: 4223.73, bico: { combustivel: { id: 1, preco_venda: 6.98 } } },
        { id: 7, turno_id: null, leitura_inicial: 500, leitura_final: 800, preco_litro: 6.5, valor_total: 1950, bico: { combustivel: { id: 2, preco_venda: 6.9 } } },
    ]));
    servicos.despesaService.getAll.mockResolvedValue(ok([
        { id: 3, descricao: 'Amanhã', categoria: 'Outros', valor: 300, data: '2026-09-21', status: 'pendente', posto_id: 1, data_pagamento: null, observacoes: null },
        { id: 1, descricao: 'Energia', categoria: 'Energia Elétrica', valor: 150, data: DIA, status: 'pago', posto_id: 1, data_pagamento: DIA, observacoes: 'conta de agosto' },
        { id: 2, descricao: 'Lanche', categoria: null, valor: 49.9, data: DIA, status: 'pendente', posto_id: 1, data_pagamento: null, observacoes: null },
    ]));
    servicos.compraService.getByDateRange.mockResolvedValue(ok([
        { combustivel_id: 1, quantidade_litros: 3000, valor_total: 16800 },
        { combustivel_id: 1, quantidade_litros: 1000, valor_total: 5800 },
        { combustivel_id: 2, quantidade_litros: 1000, valor_total: 5000 },
    ]));
}

/** A API falsa: responde pelas três rotas que a tela chama, e grava as URLs. */
function apiFalsa(relatorio: unknown = RELATORIO_DA_API): ReturnType<typeof vi.fn> {
    const fetchFalso = vi.fn(async (url: string) => {
        const endereco = String(url);
        const corpo = endereco.includes('/relatorio-diario') ? relatorio : endereco.includes('/leituras') ? LEITURAS_DA_API : DASHBOARD_DA_API;
        return new Response(JSON.stringify(corpo), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchFalso);
    return fetchFalso;
}

function ligarModoApi(): void {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_API_LOGIN', '1');
    vi.stubEnv('VITE_API_RELATORIO', '1');
    localStorage.setItem('posto.tokenDaApi', 'token-de-teste');
}

const servicosChamados = (): number =>
    servicos.fechamentoService.getByDate.mock.calls.length +
    servicos.leituraService.getByDate.mock.calls.length +
    servicos.despesaService.getAll.mock.calls.length +
    servicos.compraService.getByDateRange.mock.calls.length;

beforeEach(() => {
    toqueNoSupabase.mockClear();
    Object.values(servicos).forEach((s) => Object.values(s).forEach((f) => f.mockReset()));
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe('Relatório Diário no modo API — nenhuma chamada ao Supabase', () => {
    it('abre o dia inteiro pelas três rotas, sem tocar no Supabase nem nos services dele', async () => {
        ligarModoApi();
        const fetchFalso = apiFalsa();

        const relatorio = montarRelatorio(await carregarInsumos(DIA, 1));

        expect(toqueNoSupabase).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(0);
        expect(fetchFalso.mock.calls.map(([url]) => String(url)).sort()).toEqual([
            'http://localhost:8000/api/postos/1/dashboard?inicio=2026-09-20&fim=2026-09-20',
            'http://localhost:8000/api/postos/1/leituras?data=2026-09-20',
            'http://localhost:8000/api/postos/1/relatorio-diario?data=2026-09-20',
        ]);
        expect(relatorio.shiftsData[0]?.status).toBe('Fechado');
        expect(relatorio.shiftsData[0]?.frentistas).toEqual(['Ana', 'Bia']);
        expect(relatorio.totals.despesas).toBeCloseTo(199.9, 10);
        expect(relatorio.expensesDay.map((d) => d.categoria)).toEqual(['Energia Elétrica', 'Outros']);
    });

    it('PARIDADE: o mesmo dia dá o MESMO relatório pelas duas fontes, número a número', async () => {
        supabaseDoMesmoDia();
        vi.stubEnv('VITE_API_URL', '');
        vi.stubEnv('VITE_API_RELATORIO', '');
        const peloSupabase = montarRelatorio(await carregarInsumos(DIA, 1));

        ligarModoApi();
        apiFalsa();
        const pelaApi = montarRelatorio(await carregarInsumos(DIA, 1));

        expect(pelaApi.shiftsData).toEqual(peloSupabase.shiftsData);
        expect(pelaApi.totals).toEqual(peloSupabase.totals);
        expect(pelaApi.expensesDay).toEqual(peloSupabase.expensesDay);
        // E o número não é trivial: lucro bruto com o custo do mês de cada produto.
        expect(pelaApi.totals.lucro).toBeCloseTo(672.569 * (6.28 - 5.65) + 300 * (6.5 - 5), 9);
        expect(pelaApi.totals.diferenca).toBeCloseTo(-10.25, 10);
    });

    it('fechamento fora da meia-noite UTC do dia fica de fora, como no .eq(data) do Supabase; null segue null', async () => {
        ligarModoApi();
        apiFalsa({
            ...RELATORIO_DA_API,
            fechamentos: [
                { id: 12, data: '2026-09-20T00:00:00Z', status: 'ABERTO', total_vendas: null, diferenca: null, turno_id: null, usuario_nome: null },
                { id: 13, data: '2026-09-20T15:00:00Z', status: 'FECHADO', total_vendas: '1.00', diferenca: '0.00', turno_id: 1, usuario_nome: 'Fora' },
            ],
        });

        const relatorio = montarRelatorio(await carregarInsumos(DIA, 1));

        expect(relatorio.shiftsData[0]?.status).toBe('Pendente');
        expect(relatorio.shiftsData[0]?.diferenca).toBeNull();
        expect(relatorio.shiftsData[0]?.frentistas).toEqual([]);
        expect(relatorio.totals.vendas).toBeCloseTo(4223.73 + 1950, 10);
    });

    it('403 da API vira erro da tela, e nunca cai no Supabase', async () => {
        ligarModoApi();
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));

        await expect(carregarInsumos(DIA, 1)).rejects.toThrow('API Laravel respondeu 403');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(0);
    });

    it('dinheiro em número cru na resposta é fora do contrato, não dado a converter', async () => {
        ligarModoApi();
        apiFalsa({ ...RELATORIO_DA_API, despesas: [{ ...RELATORIO_DA_API.despesas[0], valor: 150 }] });

        await expect(carregarInsumos(DIA, 1)).rejects.toThrow('fora do contrato');
    });
});

describe('relatorioDiarioPelaApi — a flag da tela', () => {
    it('sem VITE_API_URL e sem flag: Supabase; a flag em 1 liga mesmo assim (e a chamada falha sem_api, não cai no Supabase)', () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubEnv('VITE_API_RELATORIO', '1');
        expect(relatorioDiarioPelaApi()).toBe(true);
        vi.stubEnv('VITE_API_RELATORIO', '');
        expect(relatorioDiarioPelaApi()).toBe(false);
    });

    it('flag ausente segue o global; 0 deixa no Supabase; 1 liga', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubEnv('VITE_API_RELATORIO', '');
        expect(relatorioDiarioPelaApi()).toBe(true);
        vi.stubEnv('VITE_API_RELATORIO', '0');
        expect(relatorioDiarioPelaApi()).toBe(false);
        vi.stubEnv('VITE_API_RELATORIO', '1');
        expect(relatorioDiarioPelaApi()).toBe(true);
    });

    it('flag em 0 com a URL definida: o caminho Supabase roda e a API não é chamada', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubEnv('VITE_API_RELATORIO', '0');
        supabaseDoMesmoDia();
        const fetchFalso = apiFalsa();

        await carregarInsumos(DIA, 1);

        expect(fetchFalso).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(4);
    });
});
