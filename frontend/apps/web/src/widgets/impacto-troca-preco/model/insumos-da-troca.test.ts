import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { toqueNoSupabase } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn() }));
vi.mock('@/services/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: (_alvo, chave) => {
        toqueNoSupabase(String(chave));
        throw new Error(`Supabase tocado: ${String(chave)}`);
      },
    },
  ),
}));

import { insumosDaApi as insumosDaTroca } from './insumos-da-troca';

/**
 * Os dois widgets da Visão do Proprietário pela API (#100): o Impacto da Troca de Preço e o Centro
 * do Mês recebem as MESMAS linhas que o Supabase entregava, e nenhum dos dois toca no Supabase.
 */
const CATALOGO: Readonly<Record<string, unknown>> = {
  '/bicos': { data: [{ id: 11, numero: 1, ativo: false, combustivel: { id: 1 } }] },
  '/combustiveis': { data: [{ id: 1, nome: 'Gasolina Comum', codigo: 'GC' }] },
  '/tanques': { data: [{ id: 5, combustivel_id: 1 }] },
  '/fornecedores': { data: [{ id: 9, nome: 'Distribuidora' }] },
};

const MOVIMENTO = {
  periodo: { inicio: '2026-08-01', fim: '2026-09-24' },
  leituras: [
    { bico_id: 11, combustivel_id: 1, data: '2026-09-01', leitura_inicial: '100.000', leitura_final: '1100.000', litros_vendidos: '1000.000', preco_litro: '6.00', valor_total: '6000.00' },
  ],
  compras: [{ combustivel_id: 1, data: '2026-09-05', quantidade_litros: '3000.00', valor_total: '16800.00' }],
  despesas: [{ data: '2026-09-10', valor: '1500.00' }],
  medicoes: [
    { tanque_id: 5, data: '2026-07-31', volume_fisico: '7000.00' },
    { tanque_id: 5, data: '2026-08-31', volume_fisico: '8000.00' },
    { tanque_id: 5, data: '2026-09-23', volume_fisico: null },
    { tanque_id: 5, data: '2026-09-24', volume_fisico: '9500.50' },
  ],
};

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
  vi.stubEnv('VITE_API_LOGIN', '1');
  toqueNoSupabase.mockClear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const endereco = String(url);
    const rota = Object.keys(CATALOGO).find((r) => endereco.endsWith(r));
    return new Response(JSON.stringify(rota === undefined ? MOVIMENTO : CATALOGO[rota]), { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Impacto da Troca de Preço pela API', () => {
  it('linhas no formato do PostgREST (número), régua recortada em inicioBusca e sem a não medida', async () => {
    const lido = (await insumosDaTroca(1, '2026-08-01', '2026-09-24'))._unsafeUnwrap();

    expect(toqueNoSupabase).not.toHaveBeenCalled();
    expect(lido.leituras).toEqual([{ data: '2026-09-01', litros_vendidos: 1000, preco_litro: 6, bico: { combustivel_id: 1 } }]);
    expect(lido.compras).toEqual([{ combustivel_id: 1, data: '2026-09-05', quantidade_litros: 3000, valor_total: 16800 }]);
    // 31/07 é antes da busca e 23/09 não foi medida: as duas ficam de fora, como no Supabase.
    expect(lido.reguas).toEqual([
      { tanque_id: 5, data: '2026-08-31', volume_fisico: 8000 },
      { tanque_id: 5, data: '2026-09-24', volume_fisico: 9500.5 },
    ]);
    expect(lido.tanques).toEqual([{ id: 5, combustivel_id: 1 }]);
    expect(lido.combustiveis).toEqual([{ id: 1, nome: 'Gasolina Comum', codigo: 'GC' }]);
  });
});
