import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
  bicoService: {
    getWithDetails: vi.fn(),
  },
  frentistaService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  },
}));

import { useCarregamentoDados } from './useCarregamentoDados';
import { bicoService, frentistaService } from '../../../services/api';

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

function bico(id: number, precoVenda: number): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: 1, nome: 'Gasolina Comum', preco_venda: precoVenda },
  } as unknown as BicoComDetalhes;
}

describe('useCarregamentoDados — preço editado na tela não pode voltar sozinho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // `precos-editados` é 'permanente' (localStorage): sem limpar, o 6,28 de um
    // teste vaza para o seguinte e a ordem dos `it` passa a decidir o resultado.
    localStorage.clear();
    vi.mocked(frentistaService.getAll).mockResolvedValue({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });
    // Cadastro sempre devolve o preço de HOJE (6,98) — é o que toda recarga
    // (realtime, remontagem ou fetch inicial) rebusca do banco.
    vi.mocked(bicoService.getWithDetails).mockResolvedValue({
      success: true,
      data: [bico(1, 6.98)],
      timestamp: new Date().toISOString(),
    });
  });

  it('mantém o preço editado depois de uma recarga disparada pelo realtime (mesma montagem)', async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));

    await act(async () => {
      await result.current.carregarDados();
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.98);

    act(() => {
      result.current.updateBicoPrice(1, 6.28);
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Simula o gatilho do realtime: qualquer escrita em `Fechamento` chama
    // `carregarDados()` de novo, e o cadastro ainda devolve 6,98.
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);
  });

  it("herança do dia anterior ('se-vazio') não pisa no preço digitado; a digitação ('sobrescrever') pisa", async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    // Dia novo, sem nada digitado: a herança preenche.
    act(() => {
      result.current.updateBicoPrice(1, 6.28, 'se-vazio');
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Gerente digita 6,50. Uma recarga (realtime, reabrir a aba) tenta herdar
    // 6,28 de novo e NÃO pode vencer o que foi digitado.
    act(() => {
      result.current.updateBicoPrice(1, 6.5);
    });
    act(() => {
      result.current.updateBicoPrice(1, 6.28, 'se-vazio');
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.5);
  });

  it('mantém o preço editado depois de desmontar e montar de novo (navegar para outra tela e voltar)', async () => {
    const primeira = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await primeira.result.current.carregarDados();
    });
    act(() => {
      primeira.result.current.updateBicoPrice(1, 6.28);
    });
    expect(primeira.result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Navegar para /planilha e voltar desmonta o componente da tela — o
    // useRef morreria aqui; o sessionStorage por trás de useEstadoPersistido, não.
    primeira.desmontar();

    const segunda = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await segunda.result.current.carregarDados();
    });

    expect(segunda.result.current.bicos[0].combustivel.preco_venda).toBe(6.28);
  });

  it('não deixa o preço editado de um dia vazar para outro dia', async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });
    act(() => {
      result.current.updateBicoPrice(1, 6.28);
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Troca de dia sem desmontar (ex.: o usuário troca a data no seletor da
    // própria tela) — o dia novo não tem edição salva, então deve mostrar o
    // preço puro do cadastro, não o 6,28 que era só de 01/01.
    const outroDia = renderHook(() => useCarregamentoDados(1, '2026-02-01'));
    await act(async () => {
      await outroDia.result.current.carregarDados();
    });

    expect(outroDia.result.current.bicos[0].combustivel.preco_venda).toBe(6.98);
  });

  it('mantém todos os bicos quando updateBicoPrice é chamado várias vezes em sequência síncrona (preço por combustível)', async () => {
    vi.mocked(bicoService.getWithDetails).mockResolvedValue({
      success: true,
      data: [bico(1, 6.98), bico(2, 6.98), bico(5, 6.98)],
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    // Reproduz o botão "preço por combustível": um clique dispara várias
    // chamadas de updateBicoPrice, uma por bico, no mesmo evento.
    act(() => {
      result.current.updateBicoPrice(1, 6.28);
      result.current.updateBicoPrice(2, 6.28);
      result.current.updateBicoPrice(5, 6.28);
    });

    expect(result.current.bicos.map(b => b.combustivel.preco_venda)).toEqual([6.28, 6.28, 6.28]);
  });
});

/** Forma real de `GET /api/postos/1/frentistas` (19/09/2026): a API não filtra `ativo`. */
const frentistasDaApi = {
  data: [
    { id: 3, nome: 'Barbara', telefone: null, data_admissao: '2026-01-27T00:00:00.000000Z', ativo: false, turno_id: 2 },
    { id: 7, nome: 'Elyon', telefone: null, data_admissao: '2026-01-27T00:46:34.901295Z', ativo: true, turno_id: 2 },
  ],
};

/** Forma real de `GET /api/postos/1/bicos` (19/09/2026), com um bico inativo que o Supabase nunca devolvia. */
const bicosDaApi = {
  data: [
    {
      id: 7, numero: 1, ativo: true,
      bomba: { id: 4, nome: 'BOMBA 01', localizacao: null, ativo: true },
      combustivel: { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: '#FFD700', ativo: true, preco_venda: '6.98', preco_custo: '5.3452' },
      tanque: { id: 1 },
    },
    {
      id: 8, numero: 2, ativo: false,
      bomba: { id: 4, nome: 'BOMBA 01', localizacao: null, ativo: true },
      combustivel: { id: 2, nome: 'Gasolina Aditivada', codigo: 'GA', cor: '#FF4500', ativo: true, preco_venda: '6.98', preco_custo: '5.3110' },
      tanque: { id: 2 },
    },
  ],
};

/** `fetch` falso que responde por rota, como a API Laravel responderia. */
function apiFalsa(rotas: Record<string, unknown>): ReturnType<typeof vi.fn> {
  return vi.fn(async (entrada: unknown) => {
    const url = String(entrada);
    const rota = Object.keys(rotas).find(r => url.endsWith(r));
    return rota === undefined
      ? new Response('{}', { status: 404 })
      : new Response(JSON.stringify(rotas[rota]), { status: 200 });
  });
}

describe('useCarregamentoDados — com VITE_API_URL o catálogo vem da API (#97); sem ela, do Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    vi.mocked(frentistaService.getAll).mockResolvedValue({
      success: true,
      data: [{ id: 99, nome: 'Do Supabase', ativo: true } as unknown as Frentista],
      timestamp: new Date().toISOString(),
    });
    vi.mocked(bicoService.getWithDetails).mockResolvedValue({
      success: true,
      data: [bico(1, 6.98)],
      timestamp: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('frentistas: lê da API, deixa o inativo de fora e não chama frentistaService.getAll', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/bicos': bicosDaApi, '/api/postos/1/frentistas': frentistasDaApi }));

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.frentistas.map(f => f.id)).toEqual([7]);
    expect(result.current.erro).toBeNull();
    expect(frentistaService.getAll).not.toHaveBeenCalled();
  });

  it('bicos: lê da API, preco_venda "6.98" chega como o número 6.98, o inativo fica fora e bicoService não é chamado', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/bicos': bicosDaApi, '/api/postos/1/frentistas': frentistasDaApi }));

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.bicos.map(b => b.id)).toEqual([7]);
    expect(result.current.bicos[0]?.combustivel.preco_venda).toBe(6.98);
    expect(result.current.bicos[0]?.bomba.nome).toBe('BOMBA 01');
    expect(result.current.erro).toBeNull();
    expect(bicoService.getWithDetails).not.toHaveBeenCalled();
  });

  it('I10 vale também pela API: o preço editado na tela sobrevive à recarga que rebusca 6,98 do cadastro', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ '/api/postos/1/bicos': bicosDaApi, '/api/postos/1/frentistas': frentistasDaApi }));

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });
    act(() => {
      result.current.updateBicoPrice(7, 6.28);
    });
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.bicos[0]?.combustivel.preco_venda).toBe(6.28);
  });

  it('sem VITE_API_URL segue no Supabase e não toca a rede', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.frentistas.map(f => f.id)).toEqual([99]);
    expect(result.current.bicos.map(b => b.id)).toEqual([1]);
    expect(frentistaService.getAll).toHaveBeenCalledWith(1);
    expect(bicoService.getWithDetails).toHaveBeenCalledWith(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('API fora do ar vira `erro` na tela, não exceção nem lista inventada', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.frentistas).toEqual([]);
    expect(result.current.erro).toBe('API Laravel inacessível: Failed to fetch');
  });
});
