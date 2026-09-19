import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { FormaPagamento } from '../../../types/database/aliases';

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
