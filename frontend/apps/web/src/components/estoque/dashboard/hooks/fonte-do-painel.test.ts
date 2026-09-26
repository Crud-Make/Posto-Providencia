import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * PARIDADE das duas fontes da tela de Tanques (#103, painel-pela-api.md §11): o MESMO posto, na
 * forma que o PostgREST entregava (número, timestamp com fuso, TODAS as compras e leituras) e na
 * forma da API (string decimal, dia UTC, movimento cortado na régua mais antiga), passa pelas
 * MESMAS contas (`montar-painel.ts`) e tem de dar a mesma tela, com os números exatos abaixo.
 *
 * Cenário (hoje 25/09/2026, mês 2026-09, histórico desde 2026-08-26):
 *   T-GC (GC): réguas 10/09 = 9000 e 18/09 = 8000,50 → a partir de 18/09: venda 333,125 → 7667,375 L
 *   T-ET (ET): régua 20/08 = 3000 → compra 5000,55 (12/09), venda 50 (21/09) → 7950,55 L
 *   Antes do corte (20/08) o Supabase ainda devolve compra de GC 100 L e venda de GC 111 L (19/08):
 *   nenhuma conta as lê — a API nem as manda.
 *   Venda do mês: 333,125 + 50 = 383,125 L; despesa do mês 1500 + 250,55 = 1750,55
 *   → despesa por litro 1750,55 / 383,125.
 */

const { tabelas, historicoPorTanque } = vi.hoisted(() => ({
    tabelas: {} as Record<string, unknown[]>,
    historicoPorTanque: {} as Record<number, unknown[]>,
}));

/** Um builder do PostgREST que aceita qualquer filtro e resolve com as linhas da tabela. */
vi.mock('../../../../services/supabase', () => ({
    supabase: {
        from: (tabela: string) => {
            const builder: Record<string, unknown> = {};
            for (const metodo of ['select', 'in', 'not', 'eq', 'gte', 'lte', 'order']) builder[metodo] = () => builder;
            builder['then'] = (ok: (v: unknown) => unknown) => Promise.resolve({ data: tabelas[tabela] ?? [], error: null }).then(ok);
            return builder;
        },
    },
}));

vi.mock('../../../../services/api', () => ({
    tanqueService: {
        getAll: async () => ({
            success: true,
            data: [
                { id: 11, nome: 'T-ET', combustivel_id: 2, capacidade: 15000, estoque_atual: 123, ativo: true, posto_id: 1, created_at: 'x',
                    combustivel: { nome: 'Etanol', codigo: 'ET', preco_venda: 4.8, preco_custo: null } },
                { id: 10, nome: 'T-GC', combustivel_id: 1, capacidade: 15000, estoque_atual: 123, ativo: true, posto_id: 1, created_at: 'x',
                    combustivel: { nome: 'Gasolina Comum', codigo: 'GC', preco_venda: 6.5, preco_custo: 5.1234 } },
            ],
        }),
        getHistory: async (id: number) => ({ success: true, data: historicoPorTanque[id] ?? [] }),
        saveHistory: async () => ({ success: true, data: undefined }),
    },
}));

import { insumosDaApi } from './fonte-da-api';
import { insumosDoSupabase } from './fonte-supabase';
import { montarPainel } from './montar-painel';

const AGORA = new Date('2026-09-25T15:00:00Z');

const RESPOSTA_DA_API = {
    mes: { inicio: '2026-09-01', fim: '2026-09-30' },
    movimento_desde: '2026-08-20',
    tanques: [
        { id: 11, nome: 'T-ET', combustivel_id: 2, capacidade: '15000.00', combustivel: { nome: 'Etanol', codigo: 'ET', preco_venda: '4.80', preco_custo: null } },
        { id: 10, nome: 'T-GC', combustivel_id: 1, capacidade: '15000.00', combustivel: { nome: 'Gasolina Comum', codigo: 'GC', preco_venda: '6.50', preco_custo: '5.1234' } },
    ],
    reguas: [
        { tanque_id: 11, data: '2026-08-20', volume_fisico: '3000.00' },
        { tanque_id: 10, data: '2026-09-10', volume_fisico: '9000.00' },
        { tanque_id: 10, data: '2026-09-18', volume_fisico: '8000.50' },
    ],
    compras: [{ combustivel_id: 2, data: '2026-09-12', quantidade_litros: '5000.55' }],
    vendas: [
        { combustivel_id: 1, data: '2026-08-20', litros_vendidos: '222.500' },
        { combustivel_id: 1, data: '2026-09-20', litros_vendidos: '333.125' },
        { combustivel_id: 2, data: '2026-09-21', litros_vendidos: '50.000' },
    ],
    despesas: [{ data: '2026-09-01', valor: '1500.00' }, { data: '2026-09-30', valor: '250.55' }],
    historico: [
        { id: 7, tanque_id: 10, data: '2026-09-18', volume_livro: '8010.00', volume_fisico: '8000.50' },
        { id: 8, tanque_id: 10, data: '2026-09-19', volume_livro: '7900.00', volume_fisico: null },
    ],
};

function supabaseComOMesmoPosto(): void {
    tabelas['HistoricoTanque'] = [
        { tanque_id: 11, data: '2026-08-20', volume_fisico: 3000 },
        { tanque_id: 10, data: '2026-09-10', volume_fisico: 9000 },
        { tanque_id: 10, data: '2026-09-18', volume_fisico: 8000.5 },
    ];
    tabelas['Compra'] = [
        { combustivel_id: 1, data: '2026-08-19T00:00:00+00:00', quantidade_litros: 100 },
        { combustivel_id: 2, data: '2026-09-12T00:00:00+00:00', quantidade_litros: 5000.55 },
    ];
    tabelas['Leitura'] = [
        { data: '2026-08-19T00:00:00+00:00', litros_vendidos: 111, bico: { combustivel_id: 1 } },
        { data: '2026-08-20T00:00:00+00:00', litros_vendidos: 222.5, bico: { combustivel_id: 1 } },
        { data: '2026-09-20T00:00:00+00:00', litros_vendidos: 333.125, bico: { combustivel_id: 1 } },
        { data: '2026-09-21T00:00:00+00:00', litros_vendidos: 50, bico: { combustivel_id: 2 } },
    ];
    tabelas['Despesa'] = [{ valor: 1500 }, { valor: 250.55 }];
    historicoPorTanque[10] = [
        { id: 7, tanque_id: 10, data: '2026-09-18', volume_livro: 8010, volume_fisico: 8000.5, created_at: null },
        { id: 8, tanque_id: 10, data: '2026-09-19', volume_livro: 7900, volume_fisico: null, created_at: null },
    ];
    historicoPorTanque[11] = [];
}

describe('fontes da tela de Tanques', () => {
    let urls: URL[];

    beforeEach(() => {
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        supabaseComOMesmoPosto();
        urls = [];
        vi.stubGlobal('fetch', vi.fn(async (entrada: string | URL | Request) => {
            urls.push(new URL(String(entrada)));
            return new Response(JSON.stringify(RESPOSTA_DA_API), { status: 200 });
        }));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('a API recebe o mês e o início do histórico do relógio LOCAL', async () => {
        (await insumosDaApi(1, AGORA))._unsafeUnwrap();

        expect(urls).toHaveLength(1);
        expect(urls[0]?.pathname).toBe('/api/postos/1/tanques/painel');
        expect(urls[0]?.searchParams.get('mes')).toBe('2026-09');
        expect(urls[0]?.searchParams.get('historico_desde')).toBe('2026-08-26');
    });

    it('PARIDADE: o mesmo posto dá a MESMA tela nas duas fontes, com os números exatos', async () => {
        const pelaApi = montarPainel((await insumosDaApi(1, AGORA))._unsafeUnwrap());
        const peloSupabase = montarPainel((await insumosDoSupabase(1, AGORA))._unsafeUnwrap());

        expect(pelaApi).toEqual(peloSupabase);
        expect(pelaApi.tanques.map((t) => [t.nome, t.estoque_atual, t.medido])).toEqual([
            ['T-ET', 7950.55, true],
            ['T-GC', 7667.375, true],
        ]);
        expect(pelaApi.despesaLitro).toBe(1750.55 / 383.125);
        expect(pelaApi.tanques[0]?.combustivel).toEqual({ nome: 'Etanol', codigo: 'ET', preco_venda: 4.8, preco_custo: null });
        expect(pelaApi.historicos).toEqual({
            10: [
                { id: 7, data: '2026-09-18', volume_livro: 8010, volume_fisico: 8000.5 },
                { id: 8, data: '2026-09-19', volume_livro: 7900 },
            ],
            11: [],
        });
    });

    it('tanque sem régua: 0 L e medido = false nas duas fontes', async () => {
        tabelas['HistoricoTanque'] = [{ tanque_id: 10, data: '2026-09-18', volume_fisico: 8000.5 }];
        const semReguaNoEt = { ...RESPOSTA_DA_API, reguas: [{ tanque_id: 10, data: '2026-09-18', volume_fisico: '8000.50' }] };
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(semReguaNoEt), { status: 200 })));

        const pelaApi = montarPainel((await insumosDaApi(1, AGORA))._unsafeUnwrap());
        const peloSupabase = montarPainel((await insumosDoSupabase(1, AGORA))._unsafeUnwrap());

        expect(pelaApi.tanques).toEqual(peloSupabase.tanques);
        expect(pelaApi.tanques[0]).toMatchObject({ nome: 'T-ET', estoque_atual: 0, medido: false });
    });

    it('resposta fora do contrato (número JSON no lugar de decimal) é erro, não tela zerada', async () => {
        const quebrada = { ...RESPOSTA_DA_API, despesas: [{ data: '2026-09-01', valor: 1500 }] };
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(quebrada), { status: 200 })));

        const lido = await insumosDaApi(1, AGORA);

        expect(lido.isErr()).toBe(true);
    });
});
