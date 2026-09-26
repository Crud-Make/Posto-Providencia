import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
  leituraService: {
    getByDate: vi.fn(),
    getLastReading: vi.fn(),
  },
}));

// `base.ts` lê a sessão em `supabase.auth`; sem `auth` o acesso lança, `tokenDaSessao` engole
// e a requisição sai sem Bearer — o caminho "sem sessão", suficiente para provar a troca de fonte.
vi.mock('../../../services/supabase', () => ({ supabase: {} }));

import { useLeituras } from './useLeituras';
import { leituraService } from '../../../services/api';

/** Harness mínimo para exercitar um hook fora do @testing-library (não instalado neste projeto). */
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
  return {
    result: resultRef,
    desmontar: () => act(() => root.unmount()),
  };
}

function bico(id: number): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: 1, nome: 'Gasolina Comum', codigo: 'GC', preco_venda: 6.98 },
  } as unknown as BicoComDetalhes;
}

/** Forma real de `GET /api/postos/1/leituras?data=2026-01-05`, mais uma leitura às 23:30Z do dia. */
const leiturasDaApi = {
  data: [
    {
      id: 302, data: '2026-01-05T00:00:00Z', bico_id: 7, combustivel_id: 1, turno_id: null,
      leitura_inicial: '1716778.963', leitura_final: '1716902.419', litros_vendidos: '123.456',
      preco_litro: '6.38', valor_total: '787.65',
    },
    {
      id: 303, data: '2026-01-05T23:30:00Z', bico_id: 9, combustivel_id: 3, turno_id: null,
      leitura_inicial: '10.000', leitura_final: '20.000', litros_vendidos: '10.000',
      preco_litro: '4.59', valor_total: '45.90',
    },
  ],
};

function apiFalsa(rotas: Record<string, unknown>) {
  return vi.fn(async (entrada: string | URL | Request) => {
    const url = String(entrada);
    const rota = Object.keys(rotas).find(r => url.endsWith(r));
    return rota === undefined
      ? new Response('{}', { status: 404 })
      : new Response(JSON.stringify(rotas[rota]), { status: 200 });
  });
}

describe('useLeituras — com VITE_API_URL as leituras do dia vêm da API (#103 P5); sem ela, do Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leituraService.getLastReading).mockResolvedValue({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });
    // O Supabase devolve a linha com `bico` aninhado; o hook não lê `bico`, então o mock traz
    // só a linha (forma do PostgREST: número cru e `+00:00`).
    vi.mocked(leituraService.getByDate).mockResolvedValue({
      success: true,
      data: [{
        id: 1, data: '2026-01-05T00:00:00+00:00', bico_id: 7, combustivel_id: 1, turno_id: null,
        leitura_inicial: 500, leitura_final: 600, litros_vendidos: 100, preco_litro: 6.28,
        valor_total: 628, usuario_id: 1, posto_id: 1, createdAt: '2026-01-05T00:00:00+00:00',
      }],
      timestamp: new Date().toISOString(),
    } as unknown as Awaited<ReturnType<typeof leituraService.getByDate>>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lê da API: "1716778.963" chega à tela como "1.716.778,963", o preço do dia volta como 6.38 e getByDate não é chamado', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/leituras?data=2026-01-05': leiturasDaApi }));
    const restaurarPreco = vi.fn();

    const { result } = renderHook(() => useLeituras(1, '2026-01-05', [bico(7)], restaurarPreco));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras[7]).toEqual({ inicial: '1.716.778,963', fechamento: '1.716.902,419' });
    expect(restaurarPreco).toHaveBeenCalledWith(7, 6.38);
    expect(result.current.erro).toBeNull();
    expect(leituraService.getByDate).not.toHaveBeenCalled();
  });

  it('leitura às 23:30Z do dia não entra pela API, como não entrava pelo Supabase: o bico cai no encerrante anterior', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({
      '/api/postos/1/leituras?data=2026-01-05': leiturasDaApi,
      '/api/postos/1/leituras/ultimas?antes_de=2026-01-05': { data: [] },
    }));

    const { result } = renderHook(() => useLeituras(1, '2026-01-05', [bico(7), bico(9)]));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras[9]).toEqual({ inicial: '0,000', fechamento: '' });
    // [25/09] O encerrante anterior também vem da API (`/leituras/ultimas`), não mais do Supabase.
    expect(leituraService.getLastReading).not.toHaveBeenCalled();
  });

  it('sem VITE_API_URL segue no Supabase e não toca a rede', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => useLeituras(1, '2026-01-05', [bico(7)]));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras[7]).toEqual({ inicial: '500,000', fechamento: '600,000' });
    expect(leituraService.getByDate).toHaveBeenCalledWith('2026-01-05', 1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('API fora do ar vira `erro` na tela, não exceção nem leitura inventada', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    const { result } = renderHook(() => useLeituras(1, '2026-01-05', [bico(7)]));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras).toEqual({});
    expect(result.current.erro).toBe('API Laravel inacessível: Failed to fetch');
  });

  it('401 da rota protegida vira `erro` com o status, e o Supabase não é consultado por baixo', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"Unauthenticated."}', { status: 401 })));

    const { result } = renderHook(() => useLeituras(1, '2026-01-05', [bico(7)]));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.erro).toBe('API Laravel respondeu 401');
    expect(leituraService.getByDate).not.toHaveBeenCalled();
  });
});

/** Forma real de `GET /api/postos/1/leituras/ultimas?antes_de=2026-01-06`: uma linha por bico. */
const ultimasDaApi = {
  data: [
    {
      id: 302, data: '2026-01-05T00:00:00Z', bico_id: 7, combustivel_id: 1, turno_id: null,
      leitura_inicial: '1716778.963', leitura_final: '1716902.419', litros_vendidos: '123.456',
      preco_litro: '6.38', valor_total: '787.65',
    },
  ],
};

describe('useLeituras — o encerrante inicial de dia novo pela API (`/leituras/ultimas`, 25/09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('dia sem leitura: o inicial é o final do último dia pela API, o preço é herdado se-vazio, e o Supabase não é tocado', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({
      '/api/postos/1/leituras?data=2026-01-06': { data: [] },
      '/api/postos/1/leituras/ultimas?antes_de=2026-01-06': ultimasDaApi,
    }));
    const restaurarPreco = vi.fn();

    const { result } = renderHook(() => useLeituras(1, '2026-01-06', [bico(7), bico(9)], restaurarPreco));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras[7]).toEqual({ inicial: '1.716.902,419', fechamento: '' });
    expect(result.current.leituras[9]).toEqual({ inicial: '0,000', fechamento: '' });
    expect(restaurarPreco).toHaveBeenCalledWith(7, 6.38, 'se-vazio');
    expect(leituraService.getLastReading).not.toHaveBeenCalled();
    expect(leituraService.getByDate).not.toHaveBeenCalled();
  });

  it('401 em `/leituras/ultimas` vira `erro` na tela, não encerrante inventado', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', vi.fn(async (entrada: string | URL | Request) =>
      String(entrada).includes('/ultimas')
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify({ data: [] }), { status: 200 })));

    const { result } = renderHook(() => useLeituras(1, '2026-01-06', [bico(7)]));
    await act(async () => {
      await result.current.carregarLeituras();
    });

    expect(result.current.leituras).toEqual({});
    expect(result.current.erro).toBe('API Laravel respondeu 401');
    expect(leituraService.getLastReading).not.toHaveBeenCalled();
  });
});
