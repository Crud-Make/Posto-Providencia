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

import { useDespesaDoMes, useDespesaDoMesComErro } from './useDespesaDoMes';

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
    rerender: () => root.render(React.createElement(TestComponent)),
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
    // #103 P9 passo 5a: sem API configurada o hook segue no Supabase. O `apps/web/.env` local
    // define VITE_API_URL, então a caracterização do caminho Supabase precisa desligá-la.
    vi.stubEnv('VITE_API_URL', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('lê só a coluna valor da Despesa, com posto_id filtrado', async () => {
    const { desmontar } = await montar(7, '2026-09');

    expect(estado.consultas).toHaveLength(1);
    expect(estado.consultas[0]?.tabela).toBe('Despesa');
    expect(estado.consultas[0]?.colunas).toBe('valor');
    expect(estado.consultas[0]?.filtros).toContainEqual(['eq', 'posto_id', 7]);
    desmontar();
  });

  it('mês corrente: a janela é o MÊS CIVIL inteiro, até 30/09 e não até hoje (D1/D2, decisão do dono 22/09/2026)', async () => {
    const { desmontar } = await montar(7, '2026-09');

    expect(estado.consultas[0]?.filtros).toContainEqual(['gte', 'data', '2026-09-01']);
    expect(estado.consultas[0]?.filtros).toContainEqual(['lte', 'data', '2026-09-30']);
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

/**
 * #103 P9 passo 5a: com VITE_API_URL a despesa é `rateio.despesas_total` do `/dashboard` do MÊS
 * CIVIL, um `Number` só, em centavos. Erro segura o último valor bom e fica exposto (decisão do
 * dono, 22/09/2026).
 */
describe('useDespesaDoMes — pela API Laravel (#103 P9 passo 5a)', () => {
  function dashboard(despesasTotal: string, mes = '09', fim = '30') {
    return {
      periodo: { inicio: `2026-${mes}-01`, fim: `2026-${mes}-${fim}` },
      produtos: [],
      rateio: { mes_civil: { inicio: `2026-${mes}-01`, fim: `2026-${mes}-${fim}` }, despesas_total: despesasTotal, litros_vendidos: '1234.000' },
      leituras: [],
    };
  }

  function responderApi(...respostas: { corpo: unknown; status: number }[]): void {
    const fila = [...respostas];
    vi.stubGlobal('fetch', vi.fn(async () => {
      const r = fila.length > 1 ? fila.shift() : fila[0];
      return new Response(JSON.stringify(r?.corpo), { status: r?.status ?? 500 });
    }));
  }

  beforeEach(() => {
    estado.consultas.length = 0;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 0));
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lê o /dashboard do posto no MÊS CIVIL inteiro e não consulta o Supabase', async () => {
    responderApi({ corpo: dashboard('22158.46'), status: 200 });

    const { result, desmontar } = await montar(7, '2026-09');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/postos/7/dashboard?inicio=2026-09-01&fim=2026-09-30',
      expect.anything()
    );
    expect(estado.consultas).toHaveLength(0);
    expect(result.current).toBe(22158.46);
    desmontar();
  });

  it('é rateio.despesas_total quantizado por emCentavos — não os litros, e sem resíduo de float', async () => {
    responderApi({ corpo: dashboard('0.30000000000000004'), status: 200 });

    const { result, desmontar } = await montar(7, '2026-09');

    expect(result.current).toBe(0.3);
    desmontar();
  });

  it('erro na primeira leitura: devolve 0 (nada lido ainda), mas o erro fica exposto e vai ao console', async () => {
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    responderApi({ corpo: { message: 'Forbidden' }, status: 403 });

    const hook = renderHook(() => useDespesaDoMesComErro(7, '2026-09'));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(hook.result.current).toEqual({ despesa: 0, erro: { tipo: 'http', status: 403 } });
    expect(erroNoConsole).toHaveBeenCalled();
    hook.desmontar();
  });

  it('erro depois de um valor bom: segura o último valor bom, NUNCA vira 0, e expõe o erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    responderApi({ corpo: dashboard('900.00'), status: 200 }, { corpo: { message: 'Forbidden' }, status: 403 });

    let mes = '2026-09';
    const hook = renderHook(() => useDespesaDoMesComErro(7, mes));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(hook.result.current).toEqual({ despesa: 900, erro: null });

    mes = '2026-08';
    await act(async () => {
      hook.rerender();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(hook.result.current.despesa).toBe(900);
    expect(hook.result.current.erro).toEqual({ tipo: 'http', status: 403 });
    hook.desmontar();
  });
});
