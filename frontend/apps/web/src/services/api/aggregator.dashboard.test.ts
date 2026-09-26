import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { lucroCombustivel } from '@posto/utils';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../supabase', () => ({
    supabase: { from: fromMock },
}));

vi.mock('./combustivel.service', () => ({ combustivelService: { getAll: vi.fn() } }));
vi.mock('./estoque.service', () => ({ estoqueService: { getAll: vi.fn() } }));
vi.mock('./frentista.service', () => ({ frentistaService: { getAll: vi.fn() } }));
vi.mock('./formaPagamento.service', () => ({ formaPagamentoService: { getAll: vi.fn() } }));
vi.mock('./leitura.service', () => ({ leituraService: { getByDateRange: vi.fn() } }));
vi.mock('./fechamentoFrentista.service', () => ({ fechamentoFrentistaService: { getByDate: vi.fn() } }));
vi.mock('./despesa.service', () => ({ despesaService: { getByMonth: vi.fn() } }));
vi.mock('./compra.service', () => ({ compraService: { getByDateRange: vi.fn() } }));

import { aggregatorService } from './aggregator.service';
import { combustivelService } from './combustivel.service';
import { estoqueService } from './estoque.service';
import { frentistaService } from './frentista.service';
import { formaPagamentoService } from './formaPagamento.service';
import { leituraService } from './leitura.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { despesaService } from './despesa.service';
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

/**
 * A API Laravel falsa do Dashboard (#100 fatia 3): cada rota responde o seu. O agregado vem de
 * `dashboard`; combustíveis, frentistas, formas e sessões são o cadastro que antes vinha do Supabase
 * e, com o corte ligado, também vem da API. `falhas` troca a resposta de uma rota por um status.
 */
function apiDoDashboard(dashboard: unknown, falhas: Readonly<Record<string, number>> = {}): void {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const endereco = String(url);
        const rotaQueFalha = Object.keys(falhas).find((rota) => endereco.includes(rota));
        if (rotaQueFalha !== undefined) return new Response('{}', { status: falhas[rotaQueFalha] ?? 500 });
        const corpo = endereco.includes('/dashboard')
            ? dashboard
            : endereco.includes('/combustiveis')
                ? { data: [GASOLINA_COMUM, ETANOL].map(({ id, codigo }) => ({ id, codigo })) }
                : { data: [] };
        return new Response(JSON.stringify(corpo), { status: 200 });
    }));
}

const ok = <T>(data: T) => ({ success: true as const, data, timestamp: '2026-01-15T00:00:00.000Z' });

/** Builder fake da query crua de `Leitura` dentro de `despesaOperacionalMensal` (não passa por service). */
function leiturasDoMesNoSupabase(linhas: readonly { litros_vendidos: number }[]): void {
    const builder = {
        select: () => builder,
        gte: () => builder,
        lte: () => builder,
        eq: () => builder,
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [...linhas], error: null }),
    };
    fromMock.mockImplementation(() => builder);
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('aggregatorService.fetchDashboardData — fonte do gráfico "Volume Vendido"', () => {
    beforeEach(() => {
        leiturasDoMesNoSupabase([]);

        vi.mocked(estoqueService.getAll).mockResolvedValue(ok(ESTOQUE) as never);
        vi.mocked(frentistaService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(formaPagamentoService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(leituraService.getByDateRange).mockResolvedValue(ok(LEITURAS) as never);
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue(ok([]) as never);
        vi.mocked(despesaService.getByMonth).mockResolvedValue(ok([]) as never);
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

    it('rateia a despesa pelo mês do período filtrado, não pelo mês corrente', async () => {
        // Dashboard de janeiro aberto em qualquer outro mês: a despesa é a de janeiro.
        // Antes era `new Date()` — agosto aberto em setembro rateava a despesa de setembro.
        await aggregatorService.fetchDashboardData('2026-01-15', '2026-01-15');
        expect(despesaService.getByMonth).toHaveBeenCalledWith(2026, 1, undefined);
    });

    it('período que atravessa meses (Supabase): compra e rateio vêm só do mês de dataInicio', async () => {
        // Comportamento ATUAL do caminho Supabase, preso de propósito: `mesDoRateio` e
        // `mesDoCusto` derivam só de `dataInicio` (aggregator.service.ts `mesCivil(dataInicio)`).
        // O endpoint da API soma TODOS os meses civis do período (Periodo::mesCivil no PHP,
        // decisão do dono em 18/09/2026) — a diferença é nomeada no teste do caminho API.
        await aggregatorService.fetchDashboardData('2026-01-20', '2026-02-10');

        expect(despesaService.getByMonth).toHaveBeenCalledWith(2026, 1, undefined);
        expect(compraService.getByDateRange).toHaveBeenCalledWith('2026-01-01', '2026-01-31', undefined);
    });
});

/**
 * Paridade entre as duas fontes (#100, fatia 2): a MESMA venda, compra e despesa de janeiro,
 * servidas pelo Supabase (mocks dos services) e pela API Laravel (fetch stub com o JSON do §5),
 * têm de produzir os mesmos KPIs e o mesmo gráfico. Se divergir, o bug está no ramo da API ou no
 * mapeador — nunca se ajusta o esperado.
 *
 * Números (janeiro 01–31/01/2026), lucro calculado à mão e conferido com `lucroCombustivel`:
 *   venda   GC 1.500 L / R$ 9.000 (preço 6,00)   ET 300 L / R$ 1.200 (preço 4,00)
 *   compra  GC 2.000 L / R$ 10.000 (custo 5,00)  ET 500 L / R$ 1.500 (custo 3,00)
 *   rateio  R$ 900 ÷ 1.800 L do mês = R$ 0,50/L
 *   lucro   GC 9.000 − 1.500 × (5,00 + 0,50) = 750   ET 1.200 − 300 × (3,00 + 0,50) = 150   total 900
 */
describe('aggregatorService.fetchDashboardData — paridade Supabase × API dentro de um mês', () => {
    const POSTO = 1;
    const JANEIRO = ['2026-01-01', '2026-01-31'] as const;

    const COMPRAS_SUPABASE = [
        { id: 1, combustivel_id: 1, quantidade_litros: 2000, valor_total: 10000 },
        { id: 2, combustivel_id: 2, quantidade_litros: 500, valor_total: 1500 },
    ];
    const DESPESAS_SUPABASE = [{ id: 1, valor: 600 }, { id: 2, valor: 300 }];

    /** O mesmo dado como a API devolve: string decimal, produtos em ordem de nome. */
    const RESPOSTA_API = {
        periodo: { inicio: '2026-01-01', fim: '2026-01-31' },
        produtos: [
            { combustivel_id: 2, produto: 'Etanol', litros_vendidos: '300.000', receita: '1200.00', compras: { litros: '500.000', valor_total: '1500.00' } },
            { combustivel_id: 1, produto: 'Gasolina Comum', litros_vendidos: '1500.000', receita: '9000.00', compras: { litros: '2000.000', valor_total: '10000.00' } },
        ],
        rateio: { mes_civil: { inicio: '2026-01-01', fim: '2026-01-31' }, despesas_total: '900.00', litros_vendidos: '1800.000' },
        // Aditivo da #103 P9: o dashboard do proprietário não lê as leituras cruas.
        leituras: [],
    };

    const LUCRO_ESPERADO = 900;

    beforeEach(() => {
        // Contadores por teste: as asserções de "não chamou o Supabase" valem só para o caso corrente.
        vi.clearAllMocks();
        vi.mocked(estoqueService.getAll).mockResolvedValue(ok(ESTOQUE) as never);
        vi.mocked(frentistaService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(formaPagamentoService.getAll).mockResolvedValue(ok([]) as never);
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue(ok([]) as never);
        vi.mocked(combustivelService.getAll).mockResolvedValue(ok([GASOLINA_COMUM, ETANOL]) as never);
    });

    async function peloSupabase(compras: typeof COMPRAS_SUPABASE) {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());
        leiturasDoMesNoSupabase(LEITURAS);
        vi.mocked(leituraService.getByDateRange).mockResolvedValue(ok(LEITURAS) as never);
        vi.mocked(compraService.getByDateRange).mockResolvedValue(ok(compras) as never);
        vi.mocked(despesaService.getByMonth).mockResolvedValue(ok(DESPESAS_SUPABASE) as never);

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);
        expect(fetch).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.error);
        return result.data;
    }

    async function pelaApi(resposta: typeof RESPOSTA_API) {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        apiDoDashboard(resposta);
        vi.mocked(leituraService.getByDateRange).mockRejectedValue(new Error('não pode ler leitura no Supabase com API ligada'));
        vi.mocked(compraService.getByDateRange).mockRejectedValue(new Error('não pode ler compra no Supabase com API ligada'));
        vi.mocked(despesaService.getByMonth).mockRejectedValue(new Error('não pode ler despesa no Supabase com API ligada'));

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/dashboard?inicio=2026-01-01&fim=2026-01-31', expect.anything());
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.error);
        return result.data;
    }

    const porNome = <T extends { name: string }>(lista: readonly T[]) => [...lista].sort((a, b) => a.name.localeCompare(b.name));

    it('o lucro esperado do cenário é o de lucroCombustivel, não um número copiado da saída', () => {
        const gc = lucroCombustivel({ litros: 1500, precoVenda: 9000 / 1500, custoMedio: 10000 / 2000, despesaOperacionalLitro: 900 / 1800 });
        const et = lucroCombustivel({ litros: 300, precoVenda: 1200 / 300, custoMedio: 1500 / 500, despesaOperacionalLitro: 900 / 1800 });
        expect(gc).toBe(750);
        expect(et).toBe(150);
        expect(gc + et).toBe(LUCRO_ESPERADO);
    });

    it('mesmos KPIs e mesmo gráfico pelas duas fontes; lucro bate com o calculado à mão', async () => {
        const supabase = await peloSupabase(COMPRAS_SUPABASE);
        const api = await pelaApi(RESPOSTA_API);

        const kpis = ({ kpis }: typeof supabase) => ({
            totalSales: kpis.totalSales,
            totalVolume: kpis.totalVolume,
            totalProfit: kpis.totalProfit,
            produtosSemCompra: kpis.produtosSemCompra,
        });
        expect(kpis(api)).toEqual(kpis(supabase));
        expect(kpis(api)).toEqual({ totalSales: 10200, totalVolume: 1800, totalProfit: LUCRO_ESPERADO, produtosSemCompra: [] });

        // A API ordena produtos por nome e o Supabase pela primeira leitura: a ordem das barras
        // pode diferir, o conteúdo de cada barra não.
        expect(porNome(api.fuelData)).toEqual(porNome(supabase.fuelData));
        expect(porNome(api.fuelData).map((f) => f.name)).toEqual(['Etanol', 'Gasolina Comum']);
        expect(api.fuelData.reduce((acc, f) => acc + f.volume, 0)).toBe(api.kpis.totalVolume);

        // Dentro de um mês a janela do rateio é a mesma nas duas fontes.
        expect(api.kpis.janelaDoRateio).toEqual(supabase.kpis.janelaDoRateio);
        expect(api.kpis.janelaDoRateio).toEqual({ inicio: '2026-01-01', fim: '2026-01-31' });
    });

    it('produto vendido sem compra: totalProfit null e o nome em produtosSemCompra, nas duas fontes', async () => {
        const supabase = await peloSupabase(COMPRAS_SUPABASE.filter((c) => c.combustivel_id !== 2));
        const api = await pelaApi({
            ...RESPOSTA_API,
            produtos: RESPOSTA_API.produtos.map((p) =>
                p.combustivel_id === 2 ? { ...p, compras: { litros: '0.000', valor_total: '0.00' } } : p,
            ),
        });

        for (const lado of [supabase, api]) {
            expect(lado.kpis.totalProfit).toBeNull();
            expect(lado.kpis.produtosSemCompra).toEqual(['Etanol']);
            expect(lado.kpis.totalSales).toBe(10200);
            expect(lado.kpis.totalVolume).toBe(1800);
        }
        expect(porNome(api.fuelData)).toEqual(porNome(supabase.fuelData));
    });

    it('período que atravessa meses (API): compra e rateio somam todos os meses civis — o número MUDA em relação ao Supabase, por decisão do dono 18/09', async () => {
        // Contraste com 'período que atravessa meses (Supabase)' acima: lá compra e rateio vêm só
        // de janeiro (mês de dataInicio). Aqui a API devolve o mês civil que CONTÉM o período —
        // 01/01 a 28/02 (Periodo::mesCivil no PHP) — e a tela recebe a janela para avisar.
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        apiDoDashboard({
            ...RESPOSTA_API,
            periodo: { inicio: '2026-01-20', fim: '2026-02-10' },
            rateio: { mes_civil: { inicio: '2026-01-01', fim: '2026-02-28' }, despesas_total: '1800.00', litros_vendidos: '3600.000' },
        });
        vi.mocked(compraService.getByDateRange).mockRejectedValue(new Error('compra do Supabase não entra com API ligada'));
        vi.mocked(despesaService.getByMonth).mockRejectedValue(new Error('despesa do Supabase não entra com API ligada'));

        const result = await aggregatorService.fetchDashboardData('2026-01-20', '2026-02-10', null, POSTO);

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/dashboard?inicio=2026-01-20&fim=2026-02-10', expect.anything());
        expect(compraService.getByDateRange).not.toHaveBeenCalled();
        expect(despesaService.getByMonth).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.error);
        expect(result.data.kpis.janelaDoRateio).toEqual({ inicio: '2026-01-01', fim: '2026-02-28' });
        // Rateio dos dois meses (R$ 1.800 ÷ 3.600 L = 0,50/L) sobre a mesma venda: mesmo lucro do
        // cenário de um mês — o que muda aqui é a JANELA, e é ela que a tela precisa mostrar.
        expect(result.data.kpis.totalProfit).toBe(LUCRO_ESPERADO);
    });

    it('ensaio de 27/09: com VITE_API_URL e VITE_API_DASHBOARD=0, o Dashboard lê do Supabase e não chama a API', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubEnv('VITE_API_DASHBOARD', '0');
        vi.stubGlobal('fetch', vi.fn());
        leiturasDoMesNoSupabase(LEITURAS);
        vi.mocked(leituraService.getByDateRange).mockResolvedValue(ok(LEITURAS) as never);
        vi.mocked(compraService.getByDateRange).mockResolvedValue(ok(COMPRAS_SUPABASE) as never);
        vi.mocked(despesaService.getByMonth).mockResolvedValue(ok(DESPESAS_SUPABASE) as never);

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);

        expect(fetch).not.toHaveBeenCalled();
        expect(compraService.getByDateRange).toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (!result.success) throw new Error(result.error);
        expect(result.data.kpis.totalProfit).toBe(LUCRO_ESPERADO);
    });

    it('erro da API vira ApiResponse de erro com a mensagem do adaptador, sem cair no Supabase', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);

        expect(result.success).toBe(false);
        expect(!result.success && result.error).toBe('API Laravel respondeu 500');
        expect(!result.success && result.code).toBe('FETCH_ERROR');
    });

    it('erro do cadastro de combustíveis (catálogo da API) com a API ligada vira Err tipado e ApiResponse de erro — não exceção engolida pelo catch', async () => {
        // O agregado respondeu bem; quem falhou foi o catálogo de combustíveis (mapa id → codigo para
        // a cor), que desde a fatia 3 da #100 vem da API e não do Supabase. É Err tipado
        // (`tipo: 'cadastro'`) e a mensagem passa pelo adaptador, com o mesmo `FETCH_ERROR` da API.
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        apiDoDashboard(RESPOSTA_API, { '/combustiveis': 500 });

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);

        expect(combustivelService.getAll).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(!result.success && result.error).toBe('Cadastro de combustíveis indisponível: API Laravel respondeu 500');
        expect(!result.success && result.code).toBe('FETCH_ERROR');
    });

    it('sem VITE_API_URL, falha do Supabase nos insumos vira Err tipado (fonte_antiga) com o texto de sempre — não exceção pega pelo catch', async () => {
        // Antes da fatia 2, `extractData` lançava e o `catch` externo devolvia o `response.error` cru
        // com `code: 'ERROR'`. O texto para a tela é o MESMO (o dono não vê mensagem nova em
        // produção); o que muda é o caminho: `Err` tipado, com o `FETCH_ERROR` de todo erro de
        // insumo — `'ERROR'` aqui seria a assinatura da exceção escapando pelo catch.
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());
        leiturasDoMesNoSupabase([]);
        vi.mocked(leituraService.getByDateRange).mockResolvedValue({
            success: false as const,
            error: 'RLS negou Leitura',
            code: 'FETCH_ERROR',
            timestamp: '2026-01-15T00:00:00.000Z',
        });
        vi.mocked(compraService.getByDateRange).mockResolvedValue(ok([]) as never);
        vi.mocked(despesaService.getByMonth).mockResolvedValue(ok([]) as never);

        const result = await aggregatorService.fetchDashboardData(JANEIRO[0], JANEIRO[1], null, POSTO);

        expect(fetch).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(!result.success && result.error).toBe('RLS negou Leitura');
        expect(!result.success && result.code).toBe('FETCH_ERROR');
    });
});

/** Promessa que só resolve quando o teste mandar — para observar QUANDO cada consulta começa. */
function adiada<T>(): { promessa: Promise<T>; resolver: (valor: T) => void } {
    let resolver: (valor: T) => void = () => undefined;
    const promessa = new Promise<T>((r) => { resolver = r; });
    return { promessa, resolver };
}

/** Esvazia a fila de microtarefas sem resolver nenhuma promessa adiada. */
const esperarMicrotarefas = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Concorrência (#100, fatia 2, ajustes 2): antes da fatia 2 as 7 consultas do dashboard saíam numa
 * `Promise.all` só. O caminho sem `VITE_API_URL` — o da produção — tem de continuar assim, e o da
 * API não pode esperar a leitura da API para só então pedir estoque, frentistas, formas e
 * fechamentos. A prova: com toda consulta presa numa promessa adiada, TODAS já foram chamadas
 * antes de qualquer uma resolver.
 */
describe('aggregatorService.fetchDashboardData — uma leva só de consultas', () => {
    const POSTO = 1;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sem VITE_API_URL: as 6 consultas do Supabase começam antes de qualquer uma terminar (estoque saiu na fatia 3: só servia ao maxCapacity, que ninguém lia)', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());
        leiturasDoMesNoSupabase([]);

        const leituras = adiada<unknown>();
        const compras = adiada<unknown>();
        const despesas = adiada<unknown>();
        const frentistas = adiada<unknown>();
        const formas = adiada<unknown>();
        const fechamentos = adiada<unknown>();
        vi.mocked(leituraService.getByDateRange).mockReturnValue(leituras.promessa as never);
        vi.mocked(compraService.getByDateRange).mockReturnValue(compras.promessa as never);
        vi.mocked(despesaService.getByMonth).mockReturnValue(despesas.promessa as never);
        vi.mocked(frentistaService.getAll).mockReturnValue(frentistas.promessa as never);
        vi.mocked(formaPagamentoService.getAll).mockReturnValue(formas.promessa as never);
        vi.mocked(fechamentoFrentistaService.getByDate).mockReturnValue(fechamentos.promessa as never);

        const pendente = aggregatorService.fetchDashboardData('2026-01-15', '2026-01-15', null, POSTO);
        await esperarMicrotarefas();

        // Nada resolveu ainda — e as seis já foram pedidas.
        expect(leituraService.getByDateRange).toHaveBeenCalledTimes(1);
        expect(compraService.getByDateRange).toHaveBeenCalledTimes(1);
        expect(despesaService.getByMonth).toHaveBeenCalledTimes(1);
        expect(frentistaService.getAll).toHaveBeenCalledTimes(1);
        expect(formaPagamentoService.getAll).toHaveBeenCalledTimes(1);
        expect(fechamentoFrentistaService.getByDate).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();

        leituras.resolver(ok(LEITURAS));
        compras.resolver(ok([]));
        despesas.resolver(ok([]));
        frentistas.resolver(ok([]));
        formas.resolver(ok([]));
        fechamentos.resolver(ok([]));
        const result = await pendente;
        expect(result.success).toBe(true);
    });

    it('com VITE_API_URL: agregado, catálogo, frentistas, formas e sessões saem juntos pela API — e o Supabase não é consultado', async () => {
        // Fatia 3 da #100: com o corte ligado, TODO o Dashboard vem da API (o login pela API não cria
        // sessão do Supabase, e sem ela a tela ficava presa carregando). As cinco rotas são pedidas
        // antes de qualquer uma responder — a onda única continua valendo.
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const respostas = [adiada<Response>(), adiada<Response>(), adiada<Response>(), adiada<Response>(), adiada<Response>()];
        const pedidos: string[] = [];
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            pedidos.push(String(url).replace('http://localhost:8000/api/postos/1/', '').split('?')[0] ?? '');
            return respostas[pedidos.length - 1]?.promessa;
        }));

        const pendente = aggregatorService.fetchDashboardData('2026-01-15', '2026-01-15', null, POSTO);
        await esperarMicrotarefas();

        expect([...pedidos].sort()).toEqual(['combustiveis', 'dashboard', 'formas-pagamento', 'frentistas', 'sessoes']);
        for (const servico of [combustivelService.getAll, estoqueService.getAll, frentistaService.getAll, formaPagamentoService.getAll,
            fechamentoFrentistaService.getByDate, leituraService.getByDateRange, compraService.getByDateRange, despesaService.getByMonth]) {
            expect(servico).not.toHaveBeenCalled();
        }

        const corpoDe = (rota: string): unknown => rota === 'dashboard'
            ? {
                periodo: { inicio: '2026-01-15', fim: '2026-01-15' },
                produtos: [],
                rateio: { mes_civil: { inicio: '2026-01-01', fim: '2026-01-31' }, despesas_total: '0.00', litros_vendidos: '0.000' },
                leituras: [],
            }
            : { data: [] };
        pedidos.forEach((rota, i) => respostas[i]?.resolver(new Response(JSON.stringify(corpoDe(rota)), { status: 200 })));
        const result = await pendente;
        expect(result.success).toBe(true);
    });
});
