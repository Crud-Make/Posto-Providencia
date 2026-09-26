import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A fachada `services/api.ts` com a API ligada (#101, fatia 2): `VITE_API_URL` + `VITE_API_PWA=1`.
 *
 * O dublê é o `fetch` (a API Laravel); o client do Supabase é trocado por um que FALHA o teste se for
 * tocado — é a prova de que, com a flag, o PWA não chama o Supabase para nada. Prende rota, método,
 * token, query e a conversão do decimal em string para o número que as telas exibem.
 */
const supabaseTocado = vi.hoisted(() => ({ vezes: 0 }));

vi.mock('@frentista/shared/api/supabase', () => {
  const tocar = (): never => {
    supabaseTocado.vezes += 1;
    throw new Error('o Supabase não pode ser chamado com a API ligada');
  };
  return { supabase: { from: tocar, functions: { invoke: tocar } } };
});

const { api } = await import('./api');
const { RecusaDaApi } = await import('@frentista/shared/api');

type Chamada = { url: string; metodo: string; corpo: unknown; auth: string | null };
const chamadas: Chamada[] = [];
let responder: (url: string, metodo: string) => Response;

const json = (status: number, corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

const fetchFalso = vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
  const metodo = init.method ?? 'GET';
  chamadas.push({
    url,
    metodo,
    corpo: init.body === undefined ? undefined : (JSON.parse(String(init.body)) as unknown),
    auth: new Headers(init.headers).get('Authorization'),
  });
  return responder(url, metodo);
});

const SESSAO_ANA = { token: '9|ana', vence_em: '2999-01-01T00:00:00Z', frentista: { id: 7, nome: 'Ana' } };

const entrarComoAna = (): void => { localStorage.setItem('pwa.sessaoFrentista', JSON.stringify(SESSAO_ANA)); };

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.teste');
  vi.stubEnv('VITE_API_PWA', '1');
  vi.stubGlobal('fetch', fetchFalso);
  chamadas.length = 0;
  supabaseTocado.vezes = 0;
  localStorage.clear();
});

afterEach(() => {
  expect(supabaseTocado.vezes).toBe(0);
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fachada pela API — frentista', () => {
  it('a lista de escolha vai SEM token e chega sem foto; com sessão, a foto de quem entrou vem do perfil', async () => {
    responder = (url) => url.endsWith('/frentistas/escolha')
      ? json(200, { data: [{ id: 7, nome: 'Ana' }, { id: 8, nome: 'Bia' }] })
      : json(200, { data: { id: 7, nome: 'Ana', foto: 'data:image/jpeg;base64,ANA' } });

    await expect(api.getFrentistas(1)).resolves.toEqual([{ id: 7, nome: 'Ana', foto: null }, { id: 8, nome: 'Bia', foto: null }]);
    expect(chamadas).toEqual([{ url: 'http://api.teste/api/postos/1/frentistas/escolha', metodo: 'GET', corpo: undefined, auth: null }]);

    entrarComoAna();
    await expect(api.getFrentistas(1)).resolves.toEqual([
      { id: 7, nome: 'Ana', foto: 'data:image/jpeg;base64,ANA' },
      { id: 8, nome: 'Bia', foto: null },
    ]);
    expect(chamadas[2]).toMatchObject({ url: 'http://api.teste/api/postos/1/frentistas/eu', auth: 'Bearer 9|ana' });
  });

  it('a foto vai por PUT na rota do PRÓPRIO frentista, com o token dele; sem a sessão dele, nem sai', async () => {
    responder = () => json(200, { data: { id: 7, nome: 'Ana', foto: null } });
    entrarComoAna();

    await api.salvarFotoFrentista(7, 'data:image/jpeg;base64,X');
    expect(chamadas).toEqual([{
      url: 'http://api.teste/api/postos/1/frentistas/eu/foto', metodo: 'PUT', corpo: { foto: 'data:image/jpeg;base64,X' }, auth: 'Bearer 9|ana',
    }]);

    await expect(api.salvarFotoFrentista(8, null)).rejects.toBeInstanceOf(RecusaDaApi);
    expect(chamadas).toHaveLength(1);
  });

  it('401 da API apaga a sessão guardada', async () => {
    responder = () => json(401, { message: 'Token inválido.' });
    entrarComoAna();

    await expect(api.getHistoricoFrentista(7)).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
  });
});

describe('fachada pela API — fechamento', () => {
  it('envios do dia: query com a data, o valor do colega chega null e o próprio vira número', async () => {
    responder = () => json(200, { data: [
      { id: 1, frentista_id: 7, frentista: { nome: 'Ana' }, data_hora_envio: '2026-09-25T12:00:00Z', valor_conferido: '3688.65' },
      { id: 2, frentista_id: 8, frentista: { nome: 'Bia' }, data_hora_envio: '2026-09-25T13:00:00Z', valor_conferido: null },
    ] });
    entrarComoAna();

    const envios = await api.getEnviosDoDia(1, '2026-09-25');

    expect(chamadas[0]).toMatchObject({ url: 'http://api.teste/api/postos/1/envios?data=2026-09-25', metodo: 'GET', auth: 'Bearer 9|ana' });
    expect(envios.map((e) => [e.frentista_id, e.valor_conferido])).toEqual([[7, 3688.65], [8, null]]);
    expect(envios[0]?.fechamento).toEqual({ data: '2026-09-25', posto_id: 1 });
  });

  it('sem sessão no aparelho, os envios do dia recusam com 401 SEM ir à rede', async () => {
    await expect(api.getEnviosDoDia(1, '2026-09-25')).rejects.toMatchObject({ status: 401, codigo: 'sem_sessao' });
    expect(chamadas).toHaveLength(0);
  });

  it('histórico: rota sem id (o frentista é o do token) e só com a sessão DESTE frentista', async () => {
    responder = () => json(200, { data: [{
      id: 5, encerrante: '3700.00', valor_pix: '845.10', valor_dinheiro: null, valor_moedas: '0.00', valor_cartao_debito: '0.00',
      valor_cartao_credito: '0.00', valor_nota: '0.00', baratao: '0.00', diferenca_calculada: '11.35', valor_conferido: '3688.65',
      observacoes: 'x', data_hora_envio: '2026-01-07T12:00:00Z', fechamento: { data: '2026-01-07', turno_id: 1 },
    }] });
    entrarComoAna();

    const [item] = await api.getHistoricoFrentista(7);
    expect(chamadas[0]?.url).toBe('http://api.teste/api/postos/1/historico');
    expect(item).toMatchObject({ encerrante: 3700, valor_pix: 845.1, valor_dinheiro: null, fechamento: { data: '2026-01-07', turno_id: 1 } });

    await expect(api.getHistoricoFrentista(8)).rejects.toMatchObject({ status: 401 });
    expect(chamadas).toHaveLength(1);
  });
});

describe('fachada pela API — vendas', () => {
  it('produtos: preço decimal vira número para a tela', async () => {
    responder = () => json(200, { data: [{ id: 3, nome: 'Óleo', preco_venda: '39.90', estoque_atual: 7, categoria: 'Óleo', unidade_medida: 'unidade' }] });
    entrarComoAna();

    await expect(api.getProdutos(1)).resolves.toEqual([{ id: 3, nome: 'Óleo', preco_venda: 39.9, estoque_atual: 7, categoria: 'Óleo', unidade_medida: 'unidade' }]);
    expect(chamadas[0]?.url).toBe('http://api.teste/api/postos/1/produtos');
  });

  it('vendas de hoje: recorte de meia-noite LOCAL até a do dia seguinte, em UTC', async () => {
    responder = () => json(200, { data: [{ id: 1, quantidade: '2.00', valor_unitario: '19.90', valor_total: '39.80', data: '2026-09-25T15:00:00Z', produto: { nome: 'Óleo', categoria: 'Óleo' } }] });
    entrarComoAna();

    const [venda] = await api.getVendasProdutoHoje(7);

    const url = new URL(chamadas[0]?.url ?? '');
    const inicio = new Date(url.searchParams.get('inicio') ?? '');
    const fim = new Date(url.searchParams.get('fim') ?? '');
    expect(url.pathname).toBe('/api/postos/1/vendas');
    expect([inicio.getHours(), inicio.getMinutes()]).toEqual([0, 0]);
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 3600 * 1000);
    expect(venda).toMatchObject({ quantidade: 2, valor_total: 39.8, produto: { nome: 'Óleo' } });
  });

  it('o carrinho vai inteiro, SEM preço, com a chave e o token do frentista', async () => {
    responder = () => json(201, { data: { repetido: false, vendas: [] } });
    entrarComoAna();

    await api.registrarCarrinhoPelaApi(7, 'c0ffee00-0000-4000-8000-000000000001', [{ produto_id: 3, quantidade: 2 }, { produto_id: 4, quantidade: 1 }]);

    expect(chamadas).toEqual([{
      url: 'http://api.teste/api/postos/1/vendas', metodo: 'POST', auth: 'Bearer 9|ana',
      corpo: { chave: 'c0ffee00-0000-4000-8000-000000000001', itens: [{ produto_id: 3, quantidade: 2 }, { produto_id: 4, quantidade: 1 }] },
    }]);
  });

  it('422 sem_estoque sobe com a mensagem do servidor', async () => {
    responder = () => json(422, { erro: { codigo: 'sem_estoque', mensagem: 'Só há 1 de Filtro no estoque.' } });
    entrarComoAna();

    await expect(api.registrarCarrinhoPelaApi(7, 'c0ffee00-0000-4000-8000-000000000002', [{ produto_id: 4, quantidade: 2 }]))
      .rejects.toThrow('Só há 1 de Filtro no estoque.');
  });
});

describe('fachada pela API — régua', () => {
  it('tanques e medições do dia pela API, com o token do aparelho', async () => {
    responder = (url) => url.includes('/regua/tanques')
      ? json(200, { data: [{ id: 2, combustivel: { nome: 'Gasolina', codigo: 'GC' } }] })
      : json(200, { data: [{ tanque_id: 2, data: '2026-09-25', volume_fisico: '5000.00' }] });
    entrarComoAna();

    await expect(api.getTanques(1)).resolves.toEqual([{ id: 2, combustivel: { nome: 'Gasolina', codigo: 'GC' } }]);
    await expect(api.getMedicoesDoDia('2026-09-25')).resolves.toEqual([{ tanque_id: 2, volume_fisico: 5000 }]);
    expect(chamadas.map((c) => c.url)).toEqual([
      'http://api.teste/api/postos/1/regua/tanques',
      'http://api.teste/api/postos/1/regua/medicoes?data=2026-09-25',
    ]);
  });

  it('grava por PUT com o volume em string e confere o que o servidor diz ter gravado', async () => {
    responder = () => json(200, { data: { tanque_id: 2, data: '2026-09-25', volume_fisico: '5000.00' } });
    entrarComoAna();

    await expect(api.salvarMedicaoTanque(2, '2026-09-25', 5000)).resolves.toBeUndefined();
    expect(chamadas[0]).toMatchObject({ metodo: 'PUT', corpo: { tanque_id: 2, data: '2026-09-25', volume_fisico: '5000' } });

    await expect(api.salvarMedicaoTanque(2, '2026-09-25', 4999)).rejects.toThrow('A medição não foi gravada');
  });

  it('valor que o CHECK recusaria nem chega à rede; 422 da janela sobe com a mensagem', async () => {
    entrarComoAna();
    await expect(api.salvarMedicaoTanque(2, '2026-09-25', -1)).rejects.toThrow('Confira o tanque');
    expect(chamadas).toHaveLength(0);

    responder = () => json(422, { erro: { codigo: 'fora_da_janela', mensagem: 'O dia 30/12/2025 está fora da janela de escrita.' } });
    await expect(api.salvarMedicaoTanque(2, '2025-12-30', 10)).rejects.toThrow('fora da janela');
  });
});
