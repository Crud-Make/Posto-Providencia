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

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

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
        respondeCom(frentistasDaApi);

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([7]);
        expect(result.current.sessoes[0]?.status).toBe('pendente');
        expect(frentistaService.getAll).not.toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/postos/1/frentistas', expect.anything());
    });

    it('com envio já salvo de um frentista, os ativos da API que não enviaram entram como sessão vazia', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        respondeCom({
            data: [
                ...frentistasDaApi.data,
                { id: 8, nome: 'Zeca', telefone: null, data_admissao: '2026-01-27T00:00:00.000000Z', ativo: true, turno_id: 1 },
            ],
        });
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue({
            success: true,
            data: [
                {
                    id: 201,
                    frentista_id: 7,
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

        const { result } = renderHook(() => useSessoesFrentistas(1, []));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([7, 8]);
        expect(result.current.sessoes[0]?.tempId).toBe('existing-201');
        expect(result.current.sessoes[1]?.tempId.startsWith('temp-')).toBe(true);
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

    it('frentistasCadastrados preenchido tem precedência: nem API nem frentistaService são consultados', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
        vi.stubGlobal('fetch', vi.fn());

        const { result } = renderHook(() => useSessoesFrentistas(1, frentistas));
        await act(async () => {
            await result.current.carregarSessoes('2026-01-01');
        });

        expect(result.current.sessoes.map(s => s.frentistaId)).toEqual([1, 2]);
        expect(fetch).not.toHaveBeenCalled();
        expect(frentistaService.getAll).not.toHaveBeenCalled();
    });
});
