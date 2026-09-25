import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Análise de Custos no modo API (#103): com o login pela API (`VITE_API_LOGIN=1`) não existe
 * sessão do Supabase, então qualquer toque nele reprova. No teste de paridade o mesmo mês passa
 * pelas duas fontes e o resultado tem de ser o MESMO, item a item.
 */
const { toqueNoSupabase, estado, fromMock, servicos } = vi.hoisted(() => ({
    toqueNoSupabase: vi.fn(),
    estado: { supabaseBloqueado: true },
    fromMock: vi.fn(),
    servicos: {
        estoqueService: { getAll: vi.fn() },
        despesaService: { getByMonth: vi.fn() },
        compraService: { getByDateRange: vi.fn() },
    },
}));
vi.mock('../../../services/supabase', () => ({
    supabase: new Proxy(
        {},
        {
            get: (_alvo, chave) => {
                toqueNoSupabase(String(chave));
                if (estado.supabaseBloqueado || chave !== 'from') throw new Error(`Supabase tocado: ${String(chave)}`);
                return fromMock;
            },
        },
    ),
}));
vi.mock('../../../services/api', () => servicos);

import { carregarAnalise } from './carregar-analise';
import { analiseCustosPelaApi } from './fonte-da-api';

/*
 * Julho/2026 do posto 1, nas duas formas. Gasolina Comum com duas leituras e duas compras (custo
 * 22.600 ÷ 4.000 = 5,65); Aditivada vendida SEM compra (fica fora e é nomeada); Etanol comprado sem
 * venda (entra com volume 0); S10 com duas leituras e uma compra. Despesas do mês 1.937,25 sobre
 * 2.823,319 L de todos os combustíveis.
 */
const CATALOGO_DA_API = {
    data: [
        { id: 4, nome: 'Diesel S10', codigo: 'S10', cor: null, ativo: true, preco_venda: '7.38', preco_custo: '0.0000' },
        { id: 3, nome: 'Etanol', codigo: 'ET', cor: null, ativo: true, preco_venda: '4.98', preco_custo: '0.0000' },
        { id: 2, nome: 'Gasolina Aditivada', codigo: 'GA', cor: null, ativo: true, preco_venda: '6.98', preco_custo: '0.0000' },
        { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: null, ativo: true, preco_venda: '6.98', preco_custo: '0.0000' },
    ],
};

const DASHBOARD_DA_API = {
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    produtos: [
        { combustivel_id: 4, produto: 'Diesel S10', litros_vendidos: '550.500', receita: '4062.69', compras: { litros: '1000.000', valor_total: '5000.00' } },
        { combustivel_id: 3, produto: 'Etanol', litros_vendidos: '0.000', receita: '0.00', compras: { litros: '500.000', valor_total: '2100.00' } },
        { combustivel_id: 2, produto: 'Gasolina Aditivada', litros_vendidos: '100.000', receita: '698.00', compras: { litros: '0.000', valor_total: '0.00' } },
        { combustivel_id: 1, produto: 'Gasolina Comum', litros_vendidos: '2172.819', receita: '13645.30', compras: { litros: '4000.000', valor_total: '22600.00' } },
    ],
    rateio: { mes_civil: { inicio: '2026-07-01', fim: '2026-07-31' }, despesas_total: '1937.25', litros_vendidos: '2823.319' },
    leituras: [],
};

const ok = <T,>(data: T) => ({ success: true as const, data });
const combustivel = (id: number, nome: string, codigo: string, preco_venda: number) => ({ id, nome, codigo, preco_venda });

/** Builder falso do PostgREST para `Leitura`: encadeia e resolve com as linhas do mês. */
function leiturasDoMes(): void {
    const linhas = [
        { data: '2026-07-01', litros_vendidos: 672.569, valor_total: 4223.73, bico: { combustivel_id: 1 } },
        { data: '2026-07-02', litros_vendidos: 300, valor_total: 2214, bico: { combustivel_id: 4 } },
        { data: '2026-07-15', litros_vendidos: 100, valor_total: 698, bico: { combustivel_id: 2 } },
        { data: '2026-07-31', litros_vendidos: 1500.25, valor_total: 9421.57, bico: { combustivel_id: 1 } },
        { data: '2026-07-31', litros_vendidos: 250.5, valor_total: 1848.69, bico: { combustivel_id: 4 } },
    ];
    const builder = {
        select: () => builder,
        gte: () => builder,
        lte: () => builder,
        eq: () => builder,
        then: (resolve: (v: { data: typeof linhas; error: null }) => void) => resolve({ data: linhas, error: null }),
    };
    fromMock.mockReturnValue(builder);
}

/** O mesmo mês como o PostgREST o entrega aos services do caminho Supabase. */
function supabaseDoMesmoMes(): void {
    estado.supabaseBloqueado = false;
    leiturasDoMes();
    servicos.estoqueService.getAll.mockResolvedValue(ok([
        { id: 1, combustivel_id: 1, combustivel: combustivel(1, 'Gasolina Comum', 'GC', 6.98) },
        { id: 2, combustivel_id: 2, combustivel: combustivel(2, 'Gasolina Aditivada', 'GA', 6.98) },
        { id: 3, combustivel_id: 3, combustivel: combustivel(3, 'Etanol', 'ET', 4.98) },
        { id: 4, combustivel_id: 4, combustivel: combustivel(4, 'Diesel S10', 'S10', 7.38) },
    ]));
    servicos.despesaService.getByMonth.mockResolvedValue(ok([{ valor: 1500 }, { valor: 349.9 }, { valor: 87.35 }]));
    servicos.compraService.getByDateRange.mockResolvedValue(ok([
        { combustivel_id: 1, quantidade_litros: 3000, valor_total: 16800 },
        { combustivel_id: 4, quantidade_litros: 1000, valor_total: 5000 },
        { combustivel_id: 3, quantidade_litros: 500, valor_total: 2100 },
        { combustivel_id: 1, quantidade_litros: 1000, valor_total: 5800 },
    ]));
}

/** A API falsa: responde pelas duas rotas que a tela chama, e grava as URLs. */
function apiFalsa(dashboard: unknown = DASHBOARD_DA_API): ReturnType<typeof vi.fn> {
    const fetchFalso = vi.fn(async (url: string) => {
        const corpo = String(url).includes('/combustiveis') ? CATALOGO_DA_API : dashboard;
        return new Response(JSON.stringify(corpo), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchFalso);
    return fetchFalso;
}

function ligarModoApi(): void {
    estado.supabaseBloqueado = true;
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_API_LOGIN', '1');
    vi.stubEnv('VITE_API_CUSTOS', '1');
    localStorage.setItem('posto.tokenDaApi', 'token-de-teste');
}

function desligarModoApi(): void {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_API_CUSTOS', '');
}

const servicosChamados = (): number =>
    servicos.estoqueService.getAll.mock.calls.length +
    servicos.despesaService.getByMonth.mock.calls.length +
    servicos.compraService.getByDateRange.mock.calls.length;

beforeEach(() => {
    toqueNoSupabase.mockClear();
    fromMock.mockReset();
    Object.values(servicos).forEach((s) => Object.values(s).forEach((f) => f.mockReset()));
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe('Análise de Custos no modo API — nenhuma chamada ao Supabase', () => {
    it('abre o mês inteiro pelas duas rotas, sem tocar no Supabase nem nos services dele', async () => {
        ligarModoApi();
        const fetchFalso = apiFalsa();

        const resultado = (await carregarAnalise(2026, 7, 1))._unsafeUnwrap();

        expect(toqueNoSupabase).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(0);
        expect(fetchFalso.mock.calls.map(([url]) => String(url)).sort()).toEqual([
            'http://localhost:8000/api/postos/1/combustiveis',
            'http://localhost:8000/api/postos/1/dashboard?inicio=2026-07-01&fim=2026-07-31',
        ]);
        expect(resultado.itens.map((i) => i.nome)).toEqual(['Gasolina Comum', 'Etanol', 'Diesel S10']);
        expect(resultado.produtosSemCompra).toEqual(['Gasolina Aditivada']);
    });

    it('PARIDADE: o mesmo mês dá a MESMA análise pelas duas fontes, número a número', async () => {
        supabaseDoMesmoMes();
        desligarModoApi();
        const peloSupabase = (await carregarAnalise(2026, 7, 1))._unsafeUnwrap();
        expect(servicosChamados()).toBe(3);

        ligarModoApi();
        apiFalsa();
        const pelaApi = (await carregarAnalise(2026, 7, 1))._unsafeUnwrap();

        expect(pelaApi).toEqual(peloSupabase);
        // E o número não é trivial: custo do mês + rateio real, lucro em centavos.
        const gc = pelaApi.itens[0];
        expect(gc?.custoMedio).toBe(5.65);
        expect(gc?.despOperacional).toBeCloseTo(1937.25 / 2823.319, 12);
        expect(gc?.lucroTotal).toBe(Math.round((13645.3 - 2172.819 * (5.65 + 1937.25 / 2823.319)) * 100) / 100);
        expect(pelaApi.itens[1]).toMatchObject({ nome: 'Etanol', volumeVendido: 0, lucroTotal: 0, margemLiquidaL: 0 });
    });

    it('403 da API vira erro da tela, e nunca cai no Supabase', async () => {
        ligarModoApi();
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));

        const erro = (await carregarAnalise(2026, 7, 1)).match(() => '', (e) => e);

        expect(erro).toContain('API Laravel respondeu 403');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(0);
    });

    it('dinheiro em número cru na resposta é fora do contrato, não dado a converter', async () => {
        ligarModoApi();
        apiFalsa({ ...DASHBOARD_DA_API, rateio: { ...DASHBOARD_DA_API.rateio, despesas_total: 1937.25 } });

        const erro = (await carregarAnalise(2026, 7, 1)).match(() => '', (e) => e);

        expect(erro).toContain('fora do contrato');
    });
});

describe('analiseCustosPelaApi — a flag da tela', () => {
    it('flag ausente segue o global; 0 deixa no Supabase; 1 liga', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubEnv('VITE_API_CUSTOS', '');
        expect(analiseCustosPelaApi()).toBe(true);
        vi.stubEnv('VITE_API_CUSTOS', '0');
        expect(analiseCustosPelaApi()).toBe(false);
        vi.stubEnv('VITE_API_CUSTOS', '1');
        expect(analiseCustosPelaApi()).toBe(true);
        vi.stubEnv('VITE_API_URL', '');
        vi.stubEnv('VITE_API_CUSTOS', '');
        expect(analiseCustosPelaApi()).toBe(false);
    });

    it('flag em 0 com a URL definida: o caminho Supabase roda e a API não é chamada', async () => {
        supabaseDoMesmoMes();
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubEnv('VITE_API_CUSTOS', '0');
        const fetchFalso = apiFalsa();

        (await carregarAnalise(2026, 7, 1))._unsafeUnwrap();

        expect(fetchFalso).not.toHaveBeenCalled();
        expect(servicosChamados()).toBe(3);
    });
});
