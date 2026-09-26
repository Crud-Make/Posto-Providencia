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

import { insumosDaApi as insumosDoResumo } from './insumos-do-resumo';

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

describe('Centro do Mês pela API', () => {
  it('as mesmas linhas do Supabase; o bico inativo continua no catálogo; a régua inteira até o fim (abertura)', async () => {
    const lido = (await insumosDoResumo(1, { inicio: '2026-09-01', fim: '2026-09-24' }))._unsafeUnwrap();

    expect(toqueNoSupabase).not.toHaveBeenCalled();
    expect(lido.bicos).toEqual([{ id: 11, numero: 1, combustivel_id: 1 }]);
    expect(lido.leituras).toEqual([
      { data: '2026-09-01', bico_id: 11, leitura_inicial: '100.000', leitura_final: '1100.000', valor_total: '6000.00' },
    ]);
    expect(lido.compras).toEqual([{ combustivel_id: 1, quantidade_litros: '3000.00', valor_total: '16800.00' }]);
    expect(lido.despesas).toEqual([{ valor: '1500.00' }]);
    expect(lido.medicoes).toHaveLength(4);
    expect(lido.fornecedores).toEqual([{ id: 9, nome: 'Distribuidora' }]);
  });
});
