import { afterEach, describe, expect, it, vi } from 'vitest';
import { baldesDoCombustivel, comBicoDoCatalogo, lerEncerrantesMensalDaApi, lerResumoMensalDaApi, paraResumoDoDia } from './fechamentoMensal.api';
import { consolidarEncerrantesDoMes, type LeituraDoMes } from './encerrantes-do-mes';
import type { BicoDaApi } from './bico.api';
import type { LeituraDoDia } from './leitura.api';

/*
 * A aba Fechamento Mensal pela API: o resumo diário tem de sair IGUAL à linha que a RPC
 * `get_fechamento_mensal` dava (menos o lucro, que a rota não tem), e os encerrantes têm de sair da
 * MESMA consolidação do caminho Supabase.
 */

const NOMES = new Map<number, string>([
    [1, 'Gasolina Comum'],
    [2, 'Gasolina Aditivada'],
    [3, 'Etanol'],
    [4, 'Diesel S10'],
    [5, 'GNV'],
]);

describe('baldesDoCombustivel — a regra ILIKE da RPC, balde a balde', () => {
    it('gasolina só quando NÃO é aditivada; aditivada, etanol e diesel por nome; fora dos quatro, nenhum', () => {
        expect(baldesDoCombustivel('Gasolina Comum')).toEqual(['vol_gasolina']);
        expect(baldesDoCombustivel('gasolina aditivada')).toEqual(['vol_aditivada']);
        expect(baldesDoCombustivel('ETANOL')).toEqual(['vol_etanol']);
        expect(baldesDoCombustivel('Diesel S10')).toEqual(['vol_diesel']);
        expect(baldesDoCombustivel('GNV')).toEqual([]);
        // Os quatro SUM(CASE) da RPC são independentes: um nome pode cair em dois.
        expect(baldesDoCombustivel('Etanol Aditivada')).toEqual(['vol_aditivada', 'vol_etanol']);
    });
});

describe('paraResumoDoDia — a linha da RPC, sem lucro', () => {
    it('volume e faturamento exatos, litros por balde, status, e os três de lucro null (nunca 0)', () => {
        const linha = paraResumoDoDia(
            {
                data: '2026-09-01',
                volume_total: '190.127',
                faturamento_bruto: '1187.31',
                volumes_por_combustivel: { '1': '100.125', '2': '50.001', '4': '20.000', '5': '20.001' },
                status: 'FECHADO',
            },
            NOMES,
        );

        expect(linha).toEqual({
            dia: '2026-09-01',
            volume_total: 190.127,
            faturamento_bruto: 1187.31,
            lucro_bruto: null,
            custo_taxas: null,
            lucro_liquido: null,
            status: 'FECHADO',
            vol_gasolina: 100.125,
            vol_aditivada: 50.001,
            vol_etanol: 0,
            vol_diesel: 20,
        });
    });

    it('soma de litros no mesmo balde não deixa resto de float', () => {
        const nomes = new Map<number, string>([[1, 'Gasolina Comum'], [6, 'Gasolina Premium']]);
        const linha = paraResumoDoDia(
            { data: '2026-09-02', volume_total: '0.300', faturamento_bruto: '1.80', volumes_por_combustivel: { '1': '0.100', '6': '0.200' }, status: 'ABERTO' },
            nomes,
        );
        expect(linha.vol_gasolina).toBe(0.3);
    });
});

describe('encerrantes do mês — a mesma consolidação das duas fontes', () => {
    const doCatalogo: BicoDaApi[] = [
        {
            id: 7, numero: 2, ativo: false,
            bomba: { id: 1, nome: 'Bomba 1', localizacao: null, ativo: true },
            combustivel: { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: null, ativo: true, preco_venda: '6.38', preco_custo: null },
            tanque: null,
        },
    ];
    const daApi: LeituraDoDia[] = [
        { id: 2, data: '2026-09-02T00:00:00Z', bico_id: 7, combustivel_id: 1, turno_id: null, leitura_inicial: 1100, leitura_final: 1250, litros_vendidos: 150, preco_litro: 6.38, valor_total: 957, posto_id: 1 },
        { id: 1, data: '2026-09-01T00:00:00Z', bico_id: 7, combustivel_id: 1, turno_id: null, leitura_inicial: 1000, leitura_final: 1100, litros_vendidos: 100, preco_litro: 6.38, valor_total: 638, posto_id: 1 },
    ];

    it('leitura da API + catálogo = leitura com `bico` do join do Supabase, e o consolidado é o mesmo', () => {
        const comoSupabase: LeituraDoMes[] = daApi.map((l) => ({
            ...l,
            data: l.data.replace('Z', '+00:00'),
            bico: { numero: 2, combustivel: { nome: 'Gasolina Comum', codigo: 'GC' } },
        }));

        const pelaApi = consolidarEncerrantesDoMes(comBicoDoCatalogo(daApi, doCatalogo));
        expect(pelaApi).toEqual(consolidarEncerrantesDoMes(comoSupabase));
        // Bico INATIVO no catálogo continua com número e combustível, como o join dava.
        expect(pelaApi.bicos.map((b) => [b.bicoNome, b.combustivelNome, b.combustivelCodigo])).toEqual([['Bico 02', 'Gasolina Comum', 'GC']]);
    });

    it('bico fora do catálogo cai no id, como o join vazio do Supabase', () => {
        const pelaApi = consolidarEncerrantesDoMes(comBicoDoCatalogo(daApi, []));
        expect(pelaApi.bicos.map((b) => [b.bicoNome, b.combustivelNome])).toEqual([['Bico 07', '—']]);
    });
});

describe('as leituras HTTP da aba', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    function apiFalsa(rotas: Record<string, unknown>) {
        return vi.fn(async (entrada: string | URL | Request) => {
            const url = String(entrada);
            const rota = Object.keys(rotas).find((r) => url.endsWith(r));
            return rota === undefined ? new Response('{}', { status: 404 }) : new Response(JSON.stringify(rotas[rota]), { status: 200 });
        });
    }

    it('resumo: /fechamento-mensal/{ano}/{mes} + nomes do catálogo', async () => {
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', apiFalsa({
            '/api/postos/1/fechamento-mensal/2026/9': {
                periodo: { inicio: '2026-09-01', fim: '2026-09-30' },
                dias: [{ data: '2026-09-01', volume_total: '20.000', faturamento_bruto: '130.00', volumes_por_combustivel: { '4': '20.000' }, status: 'ABERTO' }],
            },
            '/api/postos/1/combustiveis': { data: [{ id: 4, nome: 'Diesel S10', codigo: 'S10' }] },
        }));

        const lido = await lerResumoMensalDaApi(1, 9, 2026);
        expect(lido._unsafeUnwrap()).toEqual([expect.objectContaining({ dia: '2026-09-01', vol_diesel: 20, faturamento_bruto: 130, lucro_liquido: null })]);
    });

    it('encerrantes: pede o mês civil inteiro em /leituras?data=&ate=', async () => {
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        const fetchFalso = apiFalsa({
            '/api/postos/1/leituras?data=2026-02-01&ate=2026-02-28': { data: [] },
            '/api/postos/1/bicos': { data: [] },
        });
        vi.stubGlobal('fetch', fetchFalso);

        const lido = await lerEncerrantesMensalDaApi(1, 2, 2026);
        expect(lido.isOk()).toBe(true);
        expect(fetchFalso).toHaveBeenCalledTimes(2);
    });
});
