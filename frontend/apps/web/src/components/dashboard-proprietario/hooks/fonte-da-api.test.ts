import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lucroCombustivel } from '@posto/utils';

/**
 * Qualquer toque no client do Supabase reprova: com o login pela API não existe sessão dele, e a
 * Visão do Proprietário tem de abrir inteira sem ele (#100).
 */
const { toqueNoSupabase } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn() }));
vi.mock('../../../services/supabase', () => ({
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

import { carregarVisaoDaApi, vendaDaApi } from './fonte-da-api';
import { visaoDoProprietarioPelaApi, type ProprietarioDaApi } from '../../../services/api/proprietario.api';

/*
 * O MESMO cenário do `backend/tests/Feature/Agregacao/ProprietarioTest.php` (setembro/2026 até o dia
 * 24, posto Jorro). Lá a RPC `get_dashboard_proprietario` devolve, no Postgres, total_vendas
 * 9173.05, volume 1500.500 e lucro_bruto 620.225 = 440.225 (Gasolina, custo do mês 5,65) + 180,00
 * (Diesel S10 sem compra, custeado pelo preco_custo 5,90 do cadastro — o fallback da DECISÃO 2).
 * Aqui entram os insumos que o endpoint devolveu para esse cenário, byte a byte.
 */
const GASOLINA_SETEMBRO: ProprietarioDaApi['produtos'][number] = {
  combustivel_id: 1,
  produto: 'Gasolina Comum',
  litros_vendidos: '1200.500',
  receita: '7223.05',
  receita_a_preco_litro: '7223.05000',
  compras: { litros: '4000.000', valor_total: '22600.00' },
};

const PRODUTOS_SETEMBRO: ProprietarioDaApi['produtos'] = [
  {
    combustivel_id: 2,
    produto: 'Diesel S10',
    litros_vendidos: '300.000',
    receita: '1950.00',
    receita_a_preco_litro: '1950.00000',
    compras: { litros: '0.000', valor_total: '0.00' },
  },
  GASOLINA_SETEMBRO,
];

const RESUMO_SETEMBRO = {
  periodo: { inicio: '2026-09-01', fim: '2026-09-24' },
  produtos: PRODUTOS_SETEMBRO,
  despesas: ['1500.00', '250.50'],
  despesas_pendentes: ['777.00', '1500.00'],
  ultimo_fechamento: '2026-09-23',
};

const RESUMO_DO_DIA = {
  periodo: { inicio: '2026-09-24', fim: '2026-09-24' },
  produtos: [
    {
      combustivel_id: 1,
      produto: 'Gasolina Comum',
      litros_vendidos: '200.500',
      receita: '1223.05',
      receita_a_preco_litro: '1223.05000',
      compras: { litros: '4000.000', valor_total: '22600.00' },
    },
  ],
  despesas: ['250.50'],
  despesas_pendentes: ['777.00', '1500.00'],
  ultimo_fechamento: '2026-09-23',
};

/** O lucro bruto que a RPC dá para a Gasolina (o que ela tem de apurável): 1.200,5 × (6,0167… − 5,65). */
const LUCRO_BRUTO_GC_NA_RPC = 440.225;

describe('vendaDaApi — os insumos da API pelas funções canônicas', () => {
  it('vendas e litros batem com total_vendas e volume_total da RPC', () => {
    const venda = vendaDaApi(PRODUTOS_SETEMBRO);

    expect(venda.vendas).toBeCloseTo(9173.05, 6);
    expect(venda.litros).toBeCloseTo(1500.5, 6);
  });

  it('o lucro do produto com compra é o da RPC (a menos da quantização em centavos de lucroCombustivel)', () => {
    const venda = vendaDaApi(PRODUTOS_SETEMBRO);
    const canonico = lucroCombustivel({ litros: 1200.5, precoVenda: 7223.05 / 1200.5, custoMedio: 22600 / 4000, despesaOperacionalLitro: 0 });

    expect(venda.lucroBruto).toBe(canonico);
    expect(Math.abs(venda.lucroBruto - LUCRO_BRUTO_GC_NA_RPC)).toBeLessThanOrEqual(0.005 + 1e-9);
  });

  it('DIVERGÊNCIA NOMEADA: o S10 sem compra no mês não é custeado pelo preco_custo — vai para produtosSemCompra (DECISÃO 2)', () => {
    const venda = vendaDaApi(PRODUTOS_SETEMBRO);

    expect(venda.produtosSemCompra).toEqual(['Diesel S10']);
    // A RPC somaria +180,00 do fallback (620.225); aqui o S10 fica fora do lucro.
    expect(venda.lucroBruto).toBeLessThan(620);
  });

  it('produto sem venda não pesa, com ou sem compra', () => {
    const venda = vendaDaApi([
      { ...GASOLINA_SETEMBRO, litros_vendidos: '0.000', receita: '0.00', receita_a_preco_litro: '0.00000' },
    ]);

    expect(venda).toEqual({ vendas: 0, litros: 0, lucroBruto: 0, produtosSemCompra: [] });
  });
});

/** A API falsa: o perfil, o catálogo de frentistas e o `/proprietario` de cada período. */
function apiFalsa(perfilPostos: readonly { id: number; nome: string; papel: string }[]): ReturnType<typeof vi.fn> {
  const fetchFalso = vi.fn(async (url: string) => {
    const endereco = String(url);
    const corpo = endereco.endsWith('/api/eu')
      ? { usuario: { id: 7, nome: 'Dono', email: 'dono@posto.local', role: 'GERENTE', postos: perfilPostos } }
      : endereco.includes('/frentistas')
        ? {
            data: [
              { id: 1, nome: 'Ana', telefone: null, data_admissao: '2026-01-01T00:00:00.000000Z', ativo: true, turno_id: null },
              { id: 2, nome: 'Bia', telefone: null, data_admissao: '2026-01-01T00:00:00.000000Z', ativo: true, turno_id: null },
              { id: 3, nome: 'Caio', telefone: null, data_admissao: '2026-01-01T00:00:00.000000Z', ativo: false, turno_id: null },
            ],
          }
        : endereco.includes('inicio=2026-09-24&fim=2026-09-24')
          ? RESUMO_DO_DIA
          : RESUMO_SETEMBRO;
    return new Response(JSON.stringify(corpo), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

describe('carregarVisaoDaApi — a tela inteira pela API, sem Supabase', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_API_LOGIN', '1');
    localStorage.setItem('posto.tokenDaApi', 'token-de-teste');
    toqueNoSupabase.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('monta o resumo do mês, o do dia e os alertas — e não toca no Supabase', async () => {
    apiFalsa([{ id: 1, nome: 'Posto Jorro', papel: 'gerente' }]);

    const lido = await carregarVisaoDaApi('2026-09', '2026-09-24');
    const dados = lido._unsafeUnwrap();

    expect(toqueNoSupabase).not.toHaveBeenCalled();
    expect(dados.posto.nome).toBe('Posto Jorro');
    expect(dados.mes.vendas).toBeCloseTo(9173.05, 6);
    expect(dados.mes.despesas).toBeCloseTo(1750.5, 6);
    expect(dados.mes.temDespesa).toBe(true);
    expect(dados.mes.frentistasAtivos).toBe(2);
    expect(dados.mes.produtosSemCompra).toEqual(['Diesel S10']);
    expect(dados.hoje.vendas).toBeCloseTo(1223.05, 6);
    expect(dados.hoje.produtosSemCompra).toEqual([]);
    expect(dados.postosSummary[0]?.despesasPendentes).toBeCloseTo(2277, 6);
    expect(dados.postosSummary[0]?.ultimoFechamento).toBe('2026-09-23');
    expect(dados.alertas.map((a) => a.message)).toContain(
      'Sem compra lançada no mês para Diesel S10 — custo e lucro não apuráveis.',
    );
  });

  it('pergunta só pelos postos que o usuário GERE: o posto em que ele é operador nem é consultado', async () => {
    const fetchFalso = apiFalsa([
      { id: 1, nome: 'Posto Jorro', papel: 'gerente' },
      { id: 2, nome: 'Posto BR', papel: 'operador' },
    ]);

    const dados = (await carregarVisaoDaApi('2026-09', '2026-09-24'))._unsafeUnwrap();
    const urls = fetchFalso.mock.calls.map(([url]) => String(url));

    expect(dados.postosSummary.map((s) => s.posto.id)).toEqual([1]);
    expect(urls.some((url) => url.includes('/api/postos/2/'))).toBe(false);
  });

  it('mês fechado: a aba "Hoje" não consulta a API e vem zerada', async () => {
    const fetchFalso = apiFalsa([{ id: 1, nome: 'Posto Jorro', papel: 'admin' }]);

    const dados = (await carregarVisaoDaApi('2026-08', '2026-09-24'))._unsafeUnwrap();
    const urls = fetchFalso.mock.calls.map(([url]) => String(url));

    expect(dados.hoje.vendas).toBe(0);
    expect(urls.filter((url) => url.includes('/proprietario'))).toEqual([
      'http://localhost:8000/api/postos/1/proprietario?inicio=2026-08-01&fim=2026-08-31',
    ]);
  });

  it('sem posto que o usuário gere: falha sem_posto, não tela vazia', async () => {
    apiFalsa([{ id: 2, nome: 'Posto BR', papel: 'operador' }]);

    const falha = await carregarVisaoDaApi('2026-09', '2026-09-24').match(() => null, (erro) => erro);

    expect(falha).toEqual({ tipo: 'sem_posto' });
  });

  it('403 da API vira erro na tela, nunca cai no Supabase', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).endsWith('/api/eu')
        ? new Response(JSON.stringify({ usuario: { id: 7, nome: 'G', email: 'g@p', role: 'GERENTE', postos: [{ id: 1, nome: 'Jorro', papel: 'gerente' }] } }), { status: 200 })
        : new Response('{}', { status: 403 }),
    ));

    const falha = await carregarVisaoDaApi('2026-09', '2026-09-24').match(() => null, (erro) => erro);

    expect(falha).toEqual({ tipo: 'http', status: 403 });
    expect(toqueNoSupabase).not.toHaveBeenCalled();
  });
});

describe('visaoDoProprietarioPelaApi — a flag da tela', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('sem VITE_API_URL: Supabase, mesmo com a flag ligada', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_API_PROPRIETARIO', '');
    expect(visaoDoProprietarioPelaApi()).toBe(false);
  });

  it('flag ausente segue o global; 0 deixa no Supabase; 1 liga', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_API_PROPRIETARIO', '');
    expect(visaoDoProprietarioPelaApi()).toBe(true);
    vi.stubEnv('VITE_API_PROPRIETARIO', '0');
    expect(visaoDoProprietarioPelaApi()).toBe(false);
    vi.stubEnv('VITE_API_PROPRIETARIO', '1');
    expect(visaoDoProprietarioPelaApi()).toBe(true);
  });
});
