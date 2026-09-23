/**
 * Caracterização do `useCustoMensal` — prende o comportamento de HOJE (22/09/2026).
 *
 * @remarks
 * #103 P9, passo 1. Não diz o que o hook DEVERIA fazer; diz o que ele FAZ, para que a
 * extração do cálculo puro (passo 2) prove que nada mudou. Os casos marcados
 * "DEFEITO CONHECIDO" estão fixados de propósito: corrigi-los é outra fatia, com golden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Resposta {
  data: unknown[] | null;
  error: { message: string } | null;
}

interface Consulta {
  tabela: string;
  colunas: string;
  filtros: [string, string, unknown][];
}

const estado = vi.hoisted(() => ({
  consultas: [] as { tabela: string; colunas: string; filtros: [string, string, unknown][] }[],
  respostas: {} as Record<string, { data: unknown[] | null; error: { message: string } | null }>,
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
    const resposta = estado.respostas[tabela] ?? { data: [], error: null };
    const construtor: Construtor = Object.assign(Promise.resolve(resposta), {
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

import { useCustoMensal } from './useCustoMensal';

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

/** Deixa as promessas do mock resolverem e o React aplicar os `setState`. */
async function esperarCarga(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

function bico(id: number, combustivelId: number, nome: string): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: combustivelId, nome, preco_venda: 6 },
  } as unknown as BicoComDetalhes;
}

const BICOS: readonly BicoComDetalhes[] = [
  bico(1, 10, 'Gasolina Comum'),
  bico(2, 10, 'Gasolina Comum'),
  bico(3, 20, 'Diesel S10'),
  bico(4, 30, 'Etanol'),
];

function responder(tabela: string, resposta: Resposta): void {
  estado.respostas[tabela] = resposta;
}

function consultaDe(tabela: string): Consulta {
  const achada = estado.consultas.find(c => c.tabela === tabela);
  if (!achada) throw new Error(`nenhuma consulta a ${tabela}`);
  return achada;
}

async function montar(postoId: number | null, data: string, bicos: readonly BicoComDetalhes[] = BICOS) {
  const hook = renderHook(() => useCustoMensal(postoId, data, bicos));
  await esperarCarga();
  return hook;
}

describe('useCustoMensal — caracterização (#103 P9 passo 1)', () => {
  beforeEach(() => {
    estado.consultas.length = 0;
    estado.respostas = {};
    vi.useFakeTimers({ toFake: ['Date'] });
    // Hoje = 22/09/2026, meio-dia local.
    vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 0));
    // #103 P9 passo 4a: sem API configurada o hook segue no Supabase. O `apps/web/.env` local
    // define VITE_API_URL, então a caracterização do caminho Supabase precisa desligá-la.
    vi.stubEnv('VITE_API_URL', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe('consultas ao Supabase', () => {
    it('lê Leitura, Compra e Despesa com posto_id filtrado e as colunas de hoje', async () => {
      const { desmontar } = await montar(7, '2026-09-15');

      expect(estado.consultas.map(c => c.tabela)).toEqual(['Leitura', 'Compra', 'Despesa']);
      expect(consultaDe('Leitura').colunas).toBe('bico_id, leitura_inicial, leitura_final, valor_total');
      expect(consultaDe('Compra').colunas).toBe('combustivel_id, quantidade_litros, valor_total');
      expect(consultaDe('Despesa').colunas).toBe('valor');
      for (const c of estado.consultas) {
        expect(c.filtros).toContainEqual(['eq', 'posto_id', 7]);
      }
      desmontar();
    });

    it('mês corrente: a janela das TRÊS consultas vai do dia 1 até HOJE (intervaloDoMes), não até o fim do mês', async () => {
      const { desmontar } = await montar(7, '2026-09-15');

      for (const c of estado.consultas) {
        expect(c.filtros).toContainEqual(['gte', 'data', '2026-09-01']);
        expect(c.filtros).toContainEqual(['lte', 'data', '2026-09-22']);
      }
      desmontar();
    });

    it('mês passado: a janela é o mês fechado inteiro', async () => {
      const { desmontar } = await montar(7, '2026-08-10');

      for (const c of estado.consultas) {
        expect(c.filtros).toContainEqual(['gte', 'data', '2026-08-01']);
        expect(c.filtros).toContainEqual(['lte', 'data', '2026-08-31']);
      }
      desmontar();
    });

    it('não consulta nada sem posto, sem data ou sem bicos', async () => {
      const a = await montar(null, '2026-09-15');
      const b = await montar(7, '');
      const c = await montar(7, '2026-09-15', []);

      expect(estado.consultas).toHaveLength(0);
      expect(a.result.current).toEqual({
        custoMedioPorProduto: {},
        despesaOperacionalLitro: 0,
        temDespesa: false,
        carregando: false,
        // campo novo do passo 4a: no caminho Supabase é sempre null
        erro: null,
      });
      a.desmontar();
      b.desmontar();
      c.desmontar();
    });
  });

  describe('custo médio por produto', () => {
    it('é Σvalor ÷ Σlitros das compras do produto; produto sem compra dá null, nunca 0', async () => {
      responder('Compra', {
        data: [
          { combustivel_id: 10, quantidade_litros: 1000, valor_total: 5000 },
          { combustivel_id: 10, quantidade_litros: 3000, valor_total: 18000 },
          { combustivel_id: 20, quantidade_litros: '2000', valor_total: '11000' },
        ],
        error: null,
      });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.custoMedioPorProduto).toEqual({
        'Gasolina Comum': 23000 / 4000,
        'Diesel S10': 11000 / 2000,
        Etanol: null,
      });
      expect(result.current.carregando).toBe(false);
      desmontar();
    });

    it('agrupa por NOME do produto: dois bicos do mesmo combustível dão uma chave só', async () => {
      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(Object.keys(result.current.custoMedioPorProduto).sort()).toEqual([
        'Diesel S10',
        'Etanol',
        'Gasolina Comum',
      ]);
      desmontar();
    });

    it('ignora compra de combustível sem bico e compra com combustivel_id null', async () => {
      responder('Compra', {
        data: [
          { combustivel_id: 99, quantidade_litros: 500, valor_total: 99999 },
          { combustivel_id: null, quantidade_litros: 500, valor_total: 99999 },
          { combustivel_id: 30, quantidade_litros: 100, valor_total: 450 },
        ],
        error: null,
      });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.custoMedioPorProduto).toEqual({
        'Gasolina Comum': null,
        'Diesel S10': null,
        Etanol: 4.5,
      });
      desmontar();
    });
  });

  describe('rateio da despesa operacional', () => {
    it('é despesa do mês ÷ litros do encerranteMensal; temDespesa = há linha de Despesa', async () => {
      responder('Leitura', {
        data: [
          { bico_id: 1, leitura_inicial: 1000, leitura_final: 1600, valor_total: 3600 },
          { bico_id: 1, leitura_inicial: 1600, leitura_final: 2000, valor_total: 2400 },
          { bico_id: 3, leitura_inicial: '5000.5', leitura_final: '6000.5', valor_total: '6000' },
        ],
        error: null,
      });
      responder('Despesa', { data: [{ valor: 1200 }, { valor: '800' }], error: null });

      const { result, desmontar } = await montar(7, '2026-09-15');

      // Litros = salto do encerrante: bico 1 = 2000 − 1000, bico 3 = 1000.
      expect(result.current.despesaOperacionalLitro).toBe(2000 / 2000);
      expect(result.current.temDespesa).toBe(true);
      desmontar();
    });

    it('sem nenhuma linha de Despesa: temDespesa false e rateio 0', async () => {
      responder('Leitura', {
        data: [{ bico_id: 1, leitura_inicial: 0, leitura_final: 100, valor_total: 600 }],
        error: null,
      });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.despesaOperacionalLitro).toBe(0);
      expect(result.current.temDespesa).toBe(false);
      desmontar();
    });

    it('com despesa e sem litros: rateio 0 (despesaOperacionalPorLitro), temDespesa segue true', async () => {
      responder('Despesa', { data: [{ valor: 500 }], error: null });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.despesaOperacionalLitro).toBe(0);
      expect(result.current.temDespesa).toBe(true);
      desmontar();
    });

    it('leitura com inicial ou final null não quebra: o dia parcial fica de fora do salto', async () => {
      responder('Leitura', {
        data: [
          { bico_id: 1, leitura_inicial: 1000, leitura_final: 1500, valor_total: null },
          { bico_id: 1, leitura_inicial: 1500, leitura_final: null, valor_total: null },
        ],
        error: null,
      });
      responder('Despesa', { data: [{ valor: 1000 }], error: null });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.despesaOperacionalLitro).toBe(1000 / 500);
      desmontar();
    });
  });

  describe('DEFEITOS CONHECIDOS — fixados como estão, não corrigir nesta fatia', () => {
    it('D5: toda leitura entra com dia 1 e sem .order(), então o salto depende da ORDEM em que o banco devolve', async () => {
      responder('Despesa', { data: [{ valor: 1000 }], error: null });
      // Mesmo par de dias, ordem invertida: o "primeiro" inicial é o do dia 2 e o
      // "último" final é o do dia 1 → salto 0, e o rateio cai para 0.
      responder('Leitura', {
        data: [
          { bico_id: 1, leitura_inicial: 1100, leitura_final: 1200, valor_total: null },
          { bico_id: 1, leitura_inicial: 1000, leitura_final: 1100, valor_total: null },
        ],
        error: null,
      });
      const invertida = await montar(7, '2026-09-15');
      expect(invertida.result.current.despesaOperacionalLitro).toBe(0);
      invertida.desmontar();

      estado.consultas.length = 0;
      responder('Leitura', {
        data: [
          { bico_id: 1, leitura_inicial: 1000, leitura_final: 1100, valor_total: null },
          { bico_id: 1, leitura_inicial: 1100, leitura_final: 1200, valor_total: null },
        ],
        error: null,
      });
      const emOrdem = await montar(7, '2026-09-15');
      expect(emOrdem.result.current.despesaOperacionalLitro).toBe(1000 / 200);
      emOrdem.desmontar();
    });

    it('a despesa é somada em float, sem emCentavos: 0,10 + 0,20 sobre 1 L dá 0.30000000000000004', async () => {
      responder('Leitura', {
        data: [{ bico_id: 1, leitura_inicial: 0, leitura_final: 1, valor_total: null }],
        error: null,
      });
      responder('Despesa', { data: [{ valor: 0.1 }, { valor: 0.2 }], error: null });

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current.despesaOperacionalLitro).toBe(0.1 + 0.2);
      expect(result.current.despesaOperacionalLitro).not.toBe(0.3);
      desmontar();
    });

    it('o .error do Supabase é ignorado: consulta que falha vira "sem compra", "sem despesa" e rateio 0', async () => {
      const falha: Resposta = { data: null, error: { message: 'permission denied' } };
      responder('Leitura', falha);
      responder('Compra', falha);
      responder('Despesa', falha);

      const { result, desmontar } = await montar(7, '2026-09-15');

      expect(result.current).toEqual({
        custoMedioPorProduto: { 'Gasolina Comum': null, 'Diesel S10': null, Etanol: null },
        despesaOperacionalLitro: 0,
        temDespesa: false,
        carregando: false,
        // campo novo do passo 4a: no caminho Supabase é sempre null
        erro: null,
      });
      desmontar();
    });
  });
});

/**
 * #103 P9 passo 4a: com VITE_API_URL o custo vem do `/dashboard` do MÊS CIVIL. Erro vira custo
 * indisponível (todo produto null, nunca 0), sem cair para o Supabase — decisão do dono 22/09 (Q3).
 */
describe('useCustoMensal — pela API Laravel (#103 P9 passo 4a)', () => {
  const RESPOSTA = {
    periodo: { inicio: '2026-09-01', fim: '2026-09-30' },
    produtos: [
      { combustivel_id: 10, produto: 'Gasolina Comum', litros_vendidos: '0.000', receita: '0.00', compras: { litros: '4000.000', valor_total: '23000.00' } },
      { combustivel_id: 20, produto: 'Diesel S10', litros_vendidos: '0.000', receita: '0.00', compras: { litros: '0.000', valor_total: '0.00' } },
    ],
    rateio: { mes_civil: { inicio: '2026-09-01', fim: '2026-09-30' }, despesas_total: '900.00', litros_vendidos: '1.000' },
    leituras: [
      { bico_id: 1, data: '2026-09-01', leitura_inicial: '1000.000', leitura_final: '1500.000' },
      { bico_id: 1, data: '2026-09-03', leitura_inicial: '1700.000', leitura_final: '2000.000' },
      { bico_id: 3, data: '2026-09-01', leitura_inicial: '0.000', leitura_final: '800.000' },
    ],
  };

  function responderApi(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
  }

  beforeEach(() => {
    estado.consultas.length = 0;
    estado.respostas = {};
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 0));
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lê o /dashboard do posto no MÊS CIVIL inteiro (mesmo no mês corrente) e não consulta o Supabase', async () => {
    responderApi(RESPOSTA);

    const { desmontar } = await montar(7, '2026-09-15');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/postos/7/dashboard?inicio=2026-09-01&fim=2026-09-30',
      expect.anything()
    );
    expect(estado.consultas).toHaveLength(0);
    desmontar();
  });

  it('sucesso: custo por produto e rateio pelo encerrante das leituras (não pela Σ), sem erro', async () => {
    responderApi(RESPOSTA);

    const { result, desmontar } = await montar(7, '2026-09-15');

    expect(result.current).toEqual({
      custoMedioPorProduto: { 'Gasolina Comum': 23000 / 4000, 'Diesel S10': null, Etanol: null },
      // salto: bico 1 = 2000 − 1000, bico 3 = 800 → 1800 L; rateio.litros_vendidos (1 L) não é lido
      despesaOperacionalLitro: 900 / 1800,
      temDespesa: true,
      carregando: false,
      erro: null,
    });
    desmontar();
  });

  it('403 (quem só tem ver): custo indisponível — todo produto null, NUNCA 0 — com o erro exposto e sem Supabase', async () => {
    responderApi({ message: 'Forbidden' }, 403);

    const { result, desmontar } = await montar(7, '2026-09-15');

    expect(result.current.custoMedioPorProduto).toEqual({ 'Gasolina Comum': null, 'Diesel S10': null, Etanol: null });
    expect(Object.values(result.current.custoMedioPorProduto)).not.toContain(0);
    expect(result.current.erro).toEqual({ tipo: 'http', status: 403 });
    expect(result.current.carregando).toBe(false);
    expect(estado.consultas).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
    desmontar();
  });

  it('resposta fora do contrato também vira custo indisponível, não número', async () => {
    responderApi({ ...RESPOSTA, rateio: { ...RESPOSTA.rateio, despesas_total: 900 } });

    const { result, desmontar } = await montar(7, '2026-09-15');

    expect(result.current.erro?.tipo).toBe('formato');
    expect(result.current.custoMedioPorProduto).toEqual({ 'Gasolina Comum': null, 'Diesel S10': null, Etanol: null });
    desmontar();
  });

  it('resposta que chega depois de desmontar não é aplicada (flag ativo)', async () => {
    let soltar: (r: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { soltar = r; })));

    const { result, desmontar } = await montar(7, '2026-09-15');
    expect(result.current.carregando).toBe(true);
    desmontar();

    await act(async () => {
      soltar(new Response(JSON.stringify(RESPOSTA), { status: 200 }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.custoMedioPorProduto).toEqual({});
  });
});
