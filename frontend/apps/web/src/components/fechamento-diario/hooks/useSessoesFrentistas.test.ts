import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { Frentista } from '../../../types/database/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
    fechamentoFrentistaService: {
        getByDate: vi.fn(),
    },
    frentistaService: {
        getAll: vi.fn(),
    },
}));

import { useSessoesFrentistas } from './useSessoesFrentistas';
import { fechamentoFrentistaService, frentistaService } from '../../../services/api';

/** Harness mínimo pro hook (mesmo padrão de useSubmissaoFechamento.test.ts). */
function renderHook<T>(useHookFn: () => T) {
    const resultRef: { current: T } = { current: undefined as unknown as T };
    function TestComponent() {
        const value = useHookFn();
        React.useEffect(() => {
            resultRef.current = value;
        });
        return null;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
        root = createRoot(container);
        root.render(React.createElement(TestComponent));
    });
    return { result: resultRef };
}

const frentistas: Frentista[] = [
    { id: 1, nome: 'Ana', ativo: true } as Frentista,
    { id: 2, nome: 'Beto', ativo: true } as Frentista,
];

describe('useSessoesFrentistas — reconstrução de status a partir do marcador em observacoes', () => {
    beforeEach(() => {
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue({
            success: true,
            data: [
                {
                    id: 101,
                    frentista_id: 1,
                    valor_cartao: 0,
                    valor_cartao_debito: 0,
                    valor_cartao_credito: 0,
                    valor_nota: 0,
                    valor_pix: 0,
                    valor_dinheiro: 0,
                    valor_moedas: 0,
                    baratao: 0,
                    encerrante: 0,
                    valor_conferido: 0,
                    observacoes: '[CONFERIDO] tudo certo',
                    data_hora_envio: null,
                },
                {
                    id: 102,
                    frentista_id: 2,
                    valor_cartao: 0,
                    valor_cartao_debito: 0,
                    valor_cartao_credito: 0,
                    valor_nota: 0,
                    valor_pix: 0,
                    valor_dinheiro: 0,
                    valor_moedas: 0,
                    baratao: 0,
                    encerrante: 0,
                    valor_conferido: 0,
                    observacoes: '',
                    data_hora_envio: null,
                },
            ],
            timestamp: new Date().toISOString(),
        } as never);
    });

    it('marca como "conferido" a sessão cuja observacoes contém o marcador, e "pendente" as demais', async () => {
        const { result } = renderHook(() => useSessoesFrentistas(1, frentistas));

        await act(async () => {
            await result.current.carregarSessoes('2026-07-26');
        });

        const sessaoAna = result.current.sessoes.find(s => s.frentistaId === 1);
        const sessaoBeto = result.current.sessoes.find(s => s.frentistaId === 2);

        expect(sessaoAna?.status).toBe('conferido');
        expect(sessaoBeto?.status).toBe('pendente');
    });
});

/** Forma real de `GET /api/postos/1/frentistas` (19/09/2026): a API não filtra `ativo`. */
const frentistasDaApi = {
    data: [
        { id: 3, nome: 'Barbara', telefone: null, data_admissao: '2026-01-27T00:00:00.000000Z', ativo: false, turno_id: 2 },
        { id: 7, nome: 'Elyon', telefone: null, data_admissao: '2026-01-27T00:46:34.901295Z', ativo: true, turno_id: 2 },
    ],
};

/**
 * API falsa por rota. Desde a P6 o hook, com `VITE_API_URL`, bate em DUAS rotas (sessões do dia
 * e, sem `frentistasCadastrados`, frentistas), então um `fetch` que responde o mesmo corpo para
 * tudo entregaria frentistas onde se esperam sessões — e o schema recusaria.
 */
function apiFalsa(rotas: Record<string, unknown>) {
    return vi.fn(async (entrada: string | URL | Request) => {
        const url = String(entrada);
        const rota = Object.keys(rotas).find(r => url.endsWith(r));
        return rota === undefined
            ? new Response('{}', { status: 404 })
            : new Response(JSON.stringify(rotas[rota]), { status: 200 });
    });
}

const SESSOES_01 = '/api/postos/1/sessoes?data=2026-01-01';
const FRENTISTAS = '/api/postos/1/frentistas';

describe('useSessoesFrentistas — sem frentistasCadastrados, o fallback busca os frentistas: API com VITE_API_URL, Supabase sem ela', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue({
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
        } as never);
        vi.mocked(frentistaService.getAll).mockResolvedValue({
            success: true,
            data: [{ id: 99, nome: 'Do Supabase', ativo: true } as Frentista],
            timestamp: new Date().toISOString(),
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('com VITE_API_URL: semeia uma sessão por frentista ATIVO da API, o inativo fica fora e frentistaService.getAll não é chamado', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', apiFalsa({ [SESSOES_01]: { data: [] }, [FRENTISTAS]: frentistasDaApi }));

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([7]);
        expect(result.current.sessoes[0]?.status).toBe('pendente');
        expect(frentistaService.getAll).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/postos/1/frentistas', expect.anything());
    });

    it('com envio já salvo de um frentista (pela API, desde a P6), os ativos da API que não enviaram entram como sessão vazia', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', apiFalsa({
            [SESSOES_01]: {
                data: [{
                    id: 201, fechamento_id: 50, frentista_id: 7,
                    valor_dinheiro: '0.00', valor_cartao: '0.00', valor_cartao_debito: '0.00', valor_cartao_credito: '0.00',
                    valor_pix: '0.00', valor_nota: '0.00', valor_moedas: '0.00', baratao: '0.00', baratencia: '0.00',
                    valor_conferido: '0.00', encerrante: '0.00', diferenca_calculada: '0.00', observacoes: '',
                    data_hora_envio: null,
                }],
            },
            [FRENTISTAS]: {
                data: [
                    ...frentistasDaApi.data,
                    { id: 8, nome: 'Zeca', telefone: null, data_admissao: '2026-01-27T00:00:00.000000Z', ativo: true, turno_id: 1 },
                ],
            },
        }));

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([7, 8]);
        expect(result.current.sessoes[0]?.tempId).toBe('existing-201');
        expect(result.current.sessoes[1]?.tempId.startsWith('temp-')).toBe(true);
        expect(fechamentoFrentistaService.getByDate).not.toHaveBeenCalled();
    });

    it('sem VITE_API_URL segue no Supabase e não toca a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([99]);
        expect(frentistaService.getAll).toHaveBeenCalledWith(1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('API fora do ar: nenhuma sessão semeada e nenhuma exceção — o dia fica sem frentistas, não com lista inventada', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));
        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await expect(
            act(async () => {
                await result.current.carregarSessoes('2026-01-01');
            })
        ).resolves.toBeUndefined();

        expect(result.current.sessoes).toEqual([]);
        expect(result.current.carregando).toBe(false);
        expect(frentistaService.getAll).not.toHaveBeenCalled();
    });

    it('frentistasCadastrados preenchido tem precedência: a rota de frentistas e o frentistaService não são consultados', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', apiFalsa({ [SESSOES_01]: { data: [] } }));

        const { result } = renderHook(() => useSessoesFrentistas(1, frentistas));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([1, 2]);
        // A única ida à rede é a das sessões do dia (P6); frentistas vieram do parâmetro.
        expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual([`http://localhost:8001${SESSOES_01}`]);
        expect(frentistaService.getAll).not.toHaveBeenCalled();
    });
});

/**
 * Forma real de `GET /api/postos/1/sessoes?data=2026-01-05` (`FechamentoFrentistaResource.php`),
 * na ordem da API (por `frentista_id`). A sessão 402 é o envio sem os baldes opcionais: `null`
 * em cada um, que é "não informou" (I8) — e é o que 682 das 1206 sessões de produção têm em
 * `encerrante` (medido em 20/09/2026).
 */
const sessoesDaApi = {
    data: [
        {
            id: 402, fechamento_id: 77, frentista_id: 9,
            valor_dinheiro: '500.00', valor_cartao: '0.00', valor_cartao_debito: null, valor_cartao_credito: null,
            valor_pix: '0.00', valor_nota: '0.00', valor_moedas: '0.00', baratao: null, baratencia: null,
            valor_conferido: '500.00', encerrante: null, diferenca_calculada: null, observacoes: null,
            data_hora_envio: null,
        },
        {
            id: 401, fechamento_id: 77, frentista_id: 12,
            valor_dinheiro: '1234.56', valor_cartao: '0.00', valor_cartao_debito: '250.00', valor_cartao_credito: '100.50',
            valor_pix: '89.90', valor_nota: '0.00', valor_moedas: '3.25', baratao: '12.00', baratencia: '0.00',
            valor_conferido: '1690.21', encerrante: '1702.21', diferenca_calculada: '-12.00',
            observacoes: '[CONFERIDO] tudo certo', data_hora_envio: '2026-01-05T14:03:22Z',
        },
    ],
};

/** Cadastro com os dois que enviaram (9 e 12) e um que não enviou (13). */
const equipe: Frentista[] = [
    { id: 9, nome: 'Nove', ativo: true } as Frentista,
    { id: 12, nome: 'Doze', ativo: true } as Frentista,
    { id: 13, nome: 'Treze', ativo: true } as Frentista,
];

/** Forma do PostgREST para o mesmo envio sem baldes: número cru, `null` onde não informou, `+00:00` com fração. */
function supabaseDevolve(data_hora_envio: string | null): void {
    vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue({
        success: true,
        data: [{
            id: 501, fechamento_id: 77, frentista_id: 9,
            valor_dinheiro: 500, valor_cartao: 0, valor_cartao_debito: null, valor_cartao_credito: null,
            valor_pix: 0, valor_nota: 0, valor_moedas: 0, baratao: null, baratencia: null,
            valor_conferido: 500, encerrante: null, diferenca_calculada: null, observacoes: null,
            posto_id: 1, data_hora_envio, frentista: null, fechamento: null,
        }],
        timestamp: new Date().toISOString(),
    } as never);
}

const semTempId = (sessao: object | undefined): Record<string, unknown> =>
    Object.fromEntries(Object.entries(sessao ?? {}).filter(([chave]) => chave !== 'tempId'));

describe('useSessoesFrentistas — com VITE_API_URL as sessões do dia vêm da API (#103 P6); sem ela, do Supabase', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseDevolve('2026-01-05T14:03:22.553504+00:00');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('lê da API: "1234.56" chega à tela como "R$ 1.234,56", na ordem de id, com status e carimbo do envio; getByDate não é chamado', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/sessoes?data=2026-01-05': sessoesDaApi }));

        const { result } = renderHook(() => useSessoesFrentistas(1, equipe));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-05');
        });

        const [primeira, segunda, terceira] = result.current.sessoes;
        expect(result.current.sessoes.map(s => s.tempId.replace(/^temp-.*/, 'temp'))).toEqual(['existing-401', 'existing-402', 'temp']);
        expect(primeira?.frentistaId).toBe(12);
        expect(primeira?.valor_dinheiro).toBe('R$\u00a01.234,56');
        expect(primeira?.valor_cartao_debito).toBe('R$\u00a0250,00');
        expect(primeira?.valor_encerrante).toBe('R$\u00a01.702,21');
        expect(primeira?.status).toBe('conferido');
        expect(primeira?.data_hora_envio).toBe('2026-01-05T14:03:22Z');
        expect(segunda?.frentistaId).toBe(9);
        expect(segunda?.status).toBe('pendente');
        expect(terceira?.frentistaId).toBe(13);
        expect(fechamentoFrentistaService.getByDate).not.toHaveBeenCalled();
    });

    it('balde null pela API vira na tela o MESMO que o null do Supabase vira hoje — sem inventar carimbo de envio', async () => {
        // A tela mostra "R$ 0,00" no input do balde não informado (o `?? 0` do hook, decisão de
        // tela, igual nas duas fontes). A ausência que a tela preserva é `data_hora_envio`: `null`
        // vira `undefined`, e `EnviosMobile` mostra "—". Se a API passasse a mandar um carimbo
        // onde o Supabase manda null, o segundo bloco reprovaria.
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/sessoes?data=2026-01-05': sessoesDaApi }));
        const { result: pelaApi } = renderHook(() => useSessoesFrentistas(1, equipe));
        await act(async () => {
            await pelaApi.current.carregarSessoes('2026-01-05');
        });

        vi.stubEnv('VITE_API_URL', '');
        supabaseDevolve(null);
        const { result: peloSupabase } = renderHook(() => useSessoesFrentistas(1, equipe));
        await act(async () => {
            await peloSupabase.current.carregarSessoes('2026-01-05');
        });

        const semBaldesApi = pelaApi.current.sessoes.find(s => s.frentistaId === 9);
        const semBaldesSupabase = peloSupabase.current.sessoes.find(s => s.frentistaId === 9);
        expect(semBaldesApi).toBeDefined();
        expect(semTempId(semBaldesApi)).toEqual(semTempId(semBaldesSupabase));
        expect(semBaldesApi?.valor_encerrante).toBe('R$\u00a00,00');
        expect(semBaldesApi?.data_hora_envio).toBeUndefined();
        expect(semBaldesApi?.observacoes).toBe('');
    });

    it('sem VITE_API_URL segue no Supabase e não toca a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const { result } = renderHook(() => useSessoesFrentistas(1, equipe));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-05');
        });

        expect(result.current.sessoes[0]?.tempId).toBe('existing-501');
        expect(result.current.sessoes[0]?.valor_dinheiro).toBe('R$\u00a0500,00');
        expect(result.current.sessoes[0]?.data_hora_envio).toBe('2026-01-05T14:03:22.553504+00:00');
        expect(fechamentoFrentistaService.getByDate).toHaveBeenCalledWith('2026-01-05', 1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('API fora do ar: nenhuma sessão, nenhuma exceção, e o Supabase não é consultado por baixo', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const { result } = renderHook(() => useSessoesFrentistas(1, equipe));
        await expect(
            act(async () => {
                await result.current.carregarSessoes('2026-01-05');
            })
        ).resolves.toBeUndefined();

        expect(result.current.sessoes).toEqual([]);
        expect(result.current.carregando).toBe(false);
        expect(fechamentoFrentistaService.getByDate).not.toHaveBeenCalled();
    });

    it('401 da rota protegida: a tela fica sem sessões, com a mensagem do status no console, e sem cair no Supabase', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Unauthenticated."}', { status: 401 })));
        const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const { result } = renderHook(() => useSessoesFrentistas(1, equipe));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-05');
        });

        expect(result.current.sessoes).toEqual([]);
        expect(erro).toHaveBeenCalledWith(expect.any(String), 'API Laravel respondeu 401');
        expect(fechamentoFrentistaService.getByDate).not.toHaveBeenCalled();
    });
});
