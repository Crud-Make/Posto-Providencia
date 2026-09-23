/**
 * Caracterização do `useDespesaDoMes` — prende o comportamento de HOJE (22/09/2026).
 *
 * @remarks
 * #103 P9, passo 1. Os casos marcados "DEFEITO CONHECIDO" estão fixados de propósito:
 * corrigi-los é outra fatia, com golden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Resposta {
  data: unknown[] | null;
  error: { message: string } | null;
}

const estado = vi.hoisted(() => ({
  consultas: [] as { tabela: string; colunas: string; filtros: [string, string, unknown][] }[],
  resposta: { data: [], error: null } as { data: unknown[] | null; error: { message: string } | null },
}));

vi.mock('../../../services/supabase', () => {
  interface Construtor extends Promise<unknown> {
    select: (colunas: string) => Construtor;
    eq: (coluna: string, valor: unknown) => Construtor;
    gte: (coluna: string, valor: unknown) => Construtor;
    lte: (coluna: string, valor: unknown) => Construtor;
  }
  const from = (tabela: string): Construtor => {
    const consulta = { tabela, colunas: '', filtros: [] as [string, string, unknown][] };
    estado.consultas.push(consulta);
    const construtor: Construtor = Object.assign(Promise.resolve(estado.resposta), {
      select: (colunas: string) => {
        consulta.colunas = colunas;
        return construtor;
      },
      eq: (coluna: string, valor: unknown) => {
        consulta.filtros.push(['eq', coluna, valor]);
        return construtor;
      },
      gte: (coluna: string, valor: unknown) => {
        consulta.filtros.push(['gte', coluna, valor]);
        return construtor;
      },
      lte: (coluna: string, valor: unknown) => {
        consulta.filtros.push(['lte', coluna, valor]);
        return construtor;
      },
    });
    return construtor;
  };
  return { supabase: { from } };
});

import { useDespesaDoMes } from './useDespesaDoMes';

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

async function montar(postoId: number | null, mesIso: string) {
  const hook = renderHook(() => useDespesaDoMes(postoId, mesIso));
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  return hook;
}

function responder(resposta: Resposta): void {
  estado.resposta = resposta;
}

describe('useDespesaDoMes — caracterização (#103 P9 passo 1)', () => {
  beforeEach(() => {
    estado.consultas.length = 0;
    estado.resposta = { data: [], error: null };
    vi.useFakeTimers({ toFake: ['Date'] });
    // Hoje = 22/09/2026, meio-dia local.
    vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('lê só a coluna valor da Despesa, com posto_id filtrado', async () => {
    const { desmontar } = await montar(7, '2026-09');

    expect(estado.consultas).toHaveLength(1);
    expect(estado.consultas[0]?.tabela).toBe('Despesa');
    expect(estado.consultas[0]?.colunas).toBe('valor');
    expect(estado.consultas[0]?.filtros).toContainEqual(['eq', 'posto_id', 7]);
    desmontar();
  });

  it('mês corrente: a janela vai do dia 1 até HOJE (intervaloDoMes), não até o fim do mês', async () => {
    const { desmontar } = await montar(7, '2026-09');

    expect(estado.consultas[0]?.filtros).toContainEqual(['gte', 'data', '2026-09-01']);
    expect(estado.consultas[0]?.filtros).toContainEqual(['lte', 'data', '2026-09-22']);
    desmontar();
  });

  it('mês passado: a janela é o mês fechado inteiro', async () => {
    const { desmontar } = await montar(7, '2026-08');

    expect(estado.consultas[0]?.filtros).toContainEqual(['gte', 'data', '2026-08-01']);
    expect(estado.consultas[0]?.filtros).toContainEqual(['lte', 'data', '2026-08-31']);
    desmontar();
  });

  it('soma o valor de todas as linhas, aceitando numeric como string', async () => {
    responder({ data: [{ valor: 1200 }, { valor: '800.50' }, { valor: 99.5 }], error: null });

    const { result, desmontar } = await montar(7, '2026-09');

    expect(result.current).toBe(1200 + 800.5 + 99.5);
    desmontar();
  });

  it('mês sem despesa lançada devolve 0', async () => {
    const { result, desmontar } = await montar(7, '2026-09');

    expect(result.current).toBe(0);
    desmontar();
  });

  it('sem posto não consulta e devolve 0', async () => {
    const { result, desmontar } = await montar(null, '2026-09');

    expect(estado.consultas).toHaveLength(0);
    expect(result.current).toBe(0);
    desmontar();
  });

  describe('DEFEITOS CONHECIDOS — fixados como estão, não corrigir nesta fatia', () => {
    it('a soma é em float, sem emCentavos: 0,10 + 0,20 dá 0.30000000000000004', async () => {
      responder({ data: [{ valor: 0.1 }, { valor: 0.2 }], error: null });

      const { result, desmontar } = await montar(7, '2026-09');

      expect(result.current).toBe(0.1 + 0.2);
      expect(result.current).not.toBe(0.3);
      desmontar();
    });

    it('erro do Supabase só vai para o console: a tela mostra 0, como se o mês não tivesse despesa', async () => {
      const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      responder({ data: null, error: { message: 'permission denied' } });

      const { result, desmontar } = await montar(7, '2026-09');

      expect(result.current).toBe(0);
      expect(erroNoConsole).toHaveBeenCalledWith('[Compras] Falha ao ler a despesa do mês:', 'permission denied');
      desmontar();
    });
  });
});
