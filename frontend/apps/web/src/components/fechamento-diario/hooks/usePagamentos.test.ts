import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { Fechamento, FormaPagamento } from '../../../types/database/aliases';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
  formaPagamentoService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../../services/api/fechamento.service', () => ({
  fechamentoService: {
    getDoDia: vi.fn(),
    getWithDetails: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {},
}));

import { usePagamentos } from './usePagamentos';
import { formaPagamentoService } from '../../../services/api';
import { fechamentoService } from '../../../services/api/fechamento.service';

/** Harness mínimo para exercitar um hook fora do @testing-library (mesmo padrão de useCarregamentoDados.test.ts). */
function renderHook<T>(useHookFn: () => T): { result: { current: T } } {
  const resultRef: { current: T } = { current: undefined as unknown as T };
  function TestComponent(): null {
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

/** Forma real de `GET /api/postos/1/formas-pagamento` (19/09/2026): a API não filtra `ativo` e manda `taxa` em string. */
const formasDaApi = {
  data: [
    { id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: '1.90' },
    { id: 4, nome: 'Cheque', tipo: 'venda', ativo: false, taxa: '2.50' },
    { id: 2, nome: 'Dinheiro', tipo: 'venda', ativo: true, taxa: null },
  ],
};

function respondeCom(corpo: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

describe('usePagamentos — com VITE_API_URL as formas vêm da API (#97); sem ela, do Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formaPagamentoService.getAll).mockResolvedValue({
      success: true,
      data: [{ id: 99, nome: 'Do Supabase', tipo: 'venda', ativo: true, taxa: 3, posto_id: 1 } as FormaPagamento],
      timestamp: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lê da API, deixa a inativa fora, taxa "1.90" vira o número 1.9 e taxa null vira 0; formaPagamentoService não é chamado', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    respondeCom(formasDaApi);

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos();
    });

    expect(result.current.pagamentos.map(p => p.id)).toEqual([7, 2]);
    expect(result.current.pagamentos[0]?.taxa).toBe(1.9);
    expect(typeof result.current.pagamentos[0]?.taxa).toBe('number');
    expect(result.current.pagamentos[1]?.taxa).toBe(0);
    expect(result.current.pagamentos.every(p => p.valor === '')).toBe(true);
    expect(result.current.carregando).toBe(false);
    expect(formaPagamentoService.getAll).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/postos/1/formas-pagamento', expect.anything());
  });

  it('a conta da taxa não muda com a fonte: taxa 1.9 sobre R$ 100,00 dá R$ 1,90 de taxa e R$ 98,10 de líquido', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    respondeCom({ data: [{ id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: '1.90' }] });

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos();
    });
    act(() => {
      result.current.definirPagamentos(prev => prev.map(p => ({ ...p, valor: 'R$ 100,00' })));
    });

    expect(result.current.totalTaxas).toBeCloseTo(1.9, 10);
    expect(result.current.totalLiquido).toBeCloseTo(98.1, 10);
  });

  it('sem VITE_API_URL segue no Supabase e não toca a rede', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos();
    });

    expect(result.current.pagamentos.map(p => p.id)).toEqual([99]);
    expect(result.current.pagamentos[0]?.taxa).toBe(3);
    expect(formaPagamentoService.getAll).toHaveBeenCalledWith(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('API fora do ar vira lista vazia e erro no console, não exceção nem lista inventada', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePagamentos(1));
    await expect(
      act(async () => {
        await result.current.carregarPagamentos();
      })
    ).resolves.toBeUndefined();

    expect(result.current.pagamentos).toEqual([]);
    expect(result.current.carregando).toBe(false);
    expect(erroNoConsole).toHaveBeenCalledWith(
      '❌ Erro ao carregar formas de pagamento:',
      'API Laravel inacessível: Failed to fetch'
    );
    expect(formaPagamentoService.getAll).not.toHaveBeenCalled();
  });

  it('API respondendo 500 vira lista vazia com o status no erro, sem exceção', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    respondeCom({ message: 'Server Error' }, 500);
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos();
    });

    expect(result.current.pagamentos).toEqual([]);
    expect(erroNoConsole).toHaveBeenCalledWith('❌ Erro ao carregar formas de pagamento:', 'API Laravel respondeu 500');
  });

  it('taxa em número cru é resposta fora do contrato: lista vazia, não dado convertido', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    respondeCom({ data: [{ id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: 1.9 }] });
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos();
    });

    expect(result.current.pagamentos).toEqual([]);
    expect(erroNoConsole).toHaveBeenCalledWith(
      '❌ Erro ao carregar formas de pagamento:',
      expect.stringContaining('Resposta da API Laravel fora do contrato')
    );
  });
});

/**
 * API falsa por rota. Desde a P7 o hook, com `VITE_API_URL` e uma data, bate em DUAS rotas
 * (formas de pagamento e o fechamento do dia), então um `fetch` que responde o mesmo corpo para
 * tudo entregaria formas onde se espera o fechamento — e o schema recusaria. Um valor `Response`
 * na rota sai como está (para simular 401 numa rota só).
 */
function apiFalsa(rotas: Record<string, unknown>) {
  return vi.fn(async (entrada: string | URL | Request) => {
    const url = String(entrada);
    const rota = Object.keys(rotas).find(r => url.endsWith(r));
    if (rota === undefined) return new Response('{}', { status: 404 });
    const corpo = rotas[rota];
    return corpo instanceof Response ? corpo.clone() : new Response(JSON.stringify(corpo), { status: 200 });
  });
}

const FORMAS = '/api/postos/1/formas-pagamento';
const FECHAMENTO_05 = '/api/postos/1/fechamento?data=2026-01-05';

/**
 * Forma real de `GET /api/postos/1/fechamento?data=2026-01-05` (`FechamentoResource.php`): o dia
 * apurado, com os recebimentos na ordem física (não a de `id`), um por forma de pagamento.
 */
const fechamentoDaApi = {
  data: {
    id: 77,
    data: '2026-01-05T00:00:00Z',
    total_vendas: '3120.00',
    total_recebido: '3120.00',
    diferenca: '0.00',
    status: 'FECHADO',
    observacoes: null,
    usuario_id: 1,
    turno_id: null,
    recebimentos: [
      { id: 902, fechamento_id: 77, forma_pagamento_id: 2, maquininha_id: null, valor: '2436.00', observacoes: null },
      { id: 901, fechamento_id: 77, forma_pagamento_id: 7, maquininha_id: 3, valor: '684.00', observacoes: null },
    ],
  },
};

describe('usePagamentos — com VITE_API_URL o fechamento do dia (e os recebimentos) vem da API (#103 P7); sem ela, do Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formaPagamentoService.getAll).mockResolvedValue({
      success: true,
      data: [
        { id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: 1.9, posto_id: 1 } as FormaPagamento,
        { id: 2, nome: 'Dinheiro', tipo: 'venda', ativo: true, taxa: 0, posto_id: 1 } as FormaPagamento,
      ],
      timestamp: new Date().toISOString(),
    });
    vi.mocked(fechamentoService.getDoDia).mockResolvedValue({
      success: true,
      data: { id: 77 } as Fechamento,
      timestamp: new Date().toISOString(),
    });
    vi.mocked(fechamentoService.getWithDetails).mockResolvedValue({
      success: true,
      data: {
        id: 77,
        recebimentos: [
          { id: 902, fechamento_id: 77, forma_pagamento_id: 2, maquininha_id: null, valor: 2436 },
          { id: 901, fechamento_id: 77, forma_pagamento_id: 7, maquininha_id: 3, valor: 684 },
        ],
      } as never,
      timestamp: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lê da API: reabrir o dia traz "2436.00" como "R$ 2.436,00" no Dinheiro e "684.00" no APP, numa ida só à rota do fechamento; getDoDia/getWithDetails não são chamados', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ [FORMAS]: formasDaApi, [FECHAMENTO_05]: fechamentoDaApi }));

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos('2026-01-05');
    });

    expect(result.current.pagamentos.map(p => [p.id, p.valor])).toEqual([
      [7, 'R$ 684,00'],
      [2, 'R$ 2.436,00'],
    ]);
    expect(fechamentoService.getDoDia).not.toHaveBeenCalled();
    expect(fechamentoService.getWithDetails).not.toHaveBeenCalled();
    const chamadas = vi.mocked(fetch).mock.calls.map(([entrada]) => String(entrada));
    expect(chamadas.filter(url => url.includes('/fechamento?'))).toEqual([`http://localhost:8001${FECHAMENTO_05}`]);
    expect(chamadas).toHaveLength(2);
  });

  it('a mesma tela pelas duas fontes: o que a API entrega e o que getDoDia + getWithDetails entregam viram os MESMOS pagamentos', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({
      [FORMAS]: { data: [
        { id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: '1.90' },
        { id: 2, nome: 'Dinheiro', tipo: 'venda', ativo: true, taxa: null },
      ] },
      [FECHAMENTO_05]: fechamentoDaApi,
    }));
    const { result: pelaApi } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await pelaApi.current.carregarPagamentos('2026-01-05');
    });

    vi.stubEnv('VITE_API_URL', '');
    const { result: peloSupabase } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await peloSupabase.current.carregarPagamentos('2026-01-05');
    });

    expect(pelaApi.current.pagamentos).toEqual(peloSupabase.current.pagamentos);
    expect(pelaApi.current.pagamentos[1]?.valor).toBe('R$ 2.436,00');
    expect(pelaApi.current.totalLiquido).toBeCloseTo(peloSupabase.current.totalLiquido, 10);
  });

  it('dia sem fechamento pela API (data: null) é dia vazio: todas as formas sem valor, sem erro no console e sem exceção', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({ [FORMAS]: formasDaApi, [FECHAMENTO_05]: { data: null } }));
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos('2026-01-05');
    });

    expect(result.current.pagamentos.map(p => p.id)).toEqual([7, 2]);
    expect(result.current.pagamentos.every(p => p.valor === '')).toBe(true);
    expect(erroNoConsole).not.toHaveBeenCalled();
  });

  it('sem VITE_API_URL segue no Supabase (getDoDia, depois getWithDetails) e não toca a rede', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn());

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos('2026-01-05');
    });

    expect(result.current.pagamentos.map(p => [p.id, p.valor])).toEqual([
      [7, 'R$ 684,00'],
      [2, 'R$ 2.436,00'],
    ]);
    expect(fechamentoService.getDoDia).toHaveBeenCalledWith('2026-01-05', 1);
    expect(fechamentoService.getWithDetails).toHaveBeenCalledWith(77);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('401 na rota do fechamento: as formas carregam do mesmo jeito, sem valor, com o status no console — e sem cair no Supabase', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8001');
    vi.stubGlobal('fetch', apiFalsa({
      [FORMAS]: formasDaApi,
      [FECHAMENTO_05]: new Response('{"message":"Unauthenticated."}', { status: 401 }),
    }));
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePagamentos(1));
    await act(async () => {
      await result.current.carregarPagamentos('2026-01-05');
    });

    expect(result.current.pagamentos.map(p => p.id)).toEqual([7, 2]);
    expect(result.current.pagamentos.every(p => p.valor === '')).toBe(true);
    expect(erroNoConsole).toHaveBeenCalledWith('❌ Erro ao carregar os recebimentos do dia:', 'API Laravel respondeu 401');
    expect(fechamentoService.getDoDia).not.toHaveBeenCalled();
  });
});
