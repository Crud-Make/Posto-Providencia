import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * O PWA inteiro com a API ligada (#101, fatia 2): nenhuma chamada ao Supabase, do primeiro render
 * ao envio do carrinho e da régua. Diferente de `App.api.test.tsx`, aqui NADA da fachada é trocado:
 * o dublê é só o `fetch`, e o client do Supabase falha o teste se for tocado.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const supabaseTocado = vi.hoisted(() => ({ vezes: 0 }));

vi.mock('@frentista/shared/api/supabase', () => {
  const tocar = (): never => {
    supabaseTocado.vezes += 1;
    throw new Error('o Supabase não pode ser chamado com a API ligada');
  };
  return { supabase: { from: tocar, functions: { invoke: tocar } } };
});

const App = (await import('./App')).default;

type Chamada = { url: string; metodo: string; corpo: unknown; auth: string | null };
const chamadas: Chamada[] = [];
/** Quando `true`, o próximo POST /vendas cai na rede (a rede caiu depois de o servidor gravar). */
let vendaFalhaNaRede = false;

const json = (status: number, corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

const ENVIOS = [
  { id: 1, frentista_id: 7, frentista: { nome: 'Ana' }, data_hora_envio: '2026-09-25T12:00:00Z', valor_conferido: '1234.50' },
  { id: 2, frentista_id: 8, frentista: { nome: 'Bia' }, data_hora_envio: '2026-09-25T13:00:00Z', valor_conferido: null },
];

/** A API Laravel de mentira: uma resposta por rota. */
function responder(url: string, metodo: string): Response {
  const caminho = new URL(url).pathname.replace('/api/postos/1', '');
  const rotas: Record<string, () => Response> = {
    'GET /frentistas/escolha': () => json(200, { data: [{ id: 7, nome: 'Ana' }, { id: 8, nome: 'Bia' }] }),
    'POST /frentistas/entrar': () => json(200, { token: '9|ana', vence_em: '2999-01-01T00:00:00Z', frentista: { id: 7, nome: 'Ana' } }),
    'GET /frentistas/eu': () => json(200, { data: { id: 7, nome: 'Ana', foto: null } }),
    'POST /presenca': () => new Response(null, { status: 204 }),
    'GET /envios': () => json(200, { data: ENVIOS }),
    'GET /produtos': () => json(200, { data: [{ id: 3, nome: 'Óleo', preco_venda: '19.90', estoque_atual: 5, categoria: 'Óleo', unidade_medida: 'un' }] }),
    'GET /vendas': () => json(200, { data: [] }),
    'POST /vendas': () => json(201, { data: { repetido: false, vendas: [] } }),
    'GET /regua/tanques': () => json(200, { data: [{ id: 2, combustivel: { nome: 'Gasolina', codigo: 'GC' } }] }),
    'GET /regua/medicoes': () => json(200, { data: [] }),
  };
  return (rotas[`${metodo} ${caminho}`] ?? (() => json(404, { message: `sem rota ${metodo} ${caminho}` })))();
}

const fetchFalso = vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
  const metodo = init.method ?? 'GET';
  const falhar = vendaFalhaNaRede && metodo === 'POST' && url.endsWith('/vendas');
  vendaFalhaNaRede = false;
  chamadas.push({
    url, metodo,
    corpo: init.body === undefined ? undefined : (JSON.parse(String(init.body)) as unknown),
    auth: new Headers(init.headers).get('Authorization'),
  });
  if (falhar) throw new TypeError('Failed to fetch');
  return responder(url, metodo);
});

let container: HTMLDivElement;
let root: Root;

const clicar = async (el: Element) => {
  await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const porTexto = (seletor: string, texto: RegExp): HTMLElement =>
  Array.from(container.querySelectorAll<HTMLElement>(seletor)).find((el) => texto.test(el.textContent ?? ''))!;
const aba = (nome: RegExp): HTMLElement => porTexto('span', nome).parentElement!;
const feitas = (metodo: string, trecho: string): Chamada[] => chamadas.filter((c) => c.metodo === metodo && c.url.includes(trecho));

const entrarComoAna = async () => {
  await clicar(porTexto('span', /Selecionar Frentista/));
  await clicar(porTexto('span', /^Ana$/));
  const pin = container.querySelector<HTMLInputElement>('input[aria-label="PIN"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(pin, '4821');
    pin.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => { pin.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
};

describe('PWA com a API ligada: nada no Supabase (#101, fatia 2)', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste');
    vi.stubEnv('VITE_API_PWA', '1');
    vi.stubGlobal('fetch', fetchFalso);
    vi.stubGlobal('alert', vi.fn());
    chamadas.length = 0;
    vendaFalhaNaRede = false;
    supabaseTocado.vezes = 0;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(React.createElement(App)); });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    expect(supabaseTocado.vezes).toBe(0);
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('a lista de escolha sai da rota pública; os envios do dia só depois do PIN, com o valor do colega oculto', async () => {
    expect(feitas('GET', '/frentistas/escolha')[0]?.auth).toBeNull();
    expect(feitas('GET', '/envios')).toHaveLength(0);
    expect(container.textContent).toContain('Não deu para carregar os envios do dia');

    await entrarComoAna();

    expect(feitas('GET', '/envios')[0]?.auth).toBe('Bearer 9|ana');
    expect(feitas('GET', '/frentistas/escolha').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('R$ 1.234,50');
    expect(container.textContent).toContain('enviado');
  });

  it('a aba Tanques exige o frentista com a API ligada; com ele, lê a régua pela API', async () => {
    await clicar(aba(/^Tanques$/));
    expect(container.textContent).toContain('Selecione um frentista primeiro');
    expect(feitas('GET', '/regua')).toHaveLength(0);

    await clicar(porTexto('button', /Voltar ao Registro/));
    await entrarComoAna();
    await clicar(aba(/^Tanques$/));

    expect(feitas('GET', '/regua/tanques')[0]?.auth).toBe('Bearer 9|ana');
    expect(container.textContent).toContain('Gasolina');
  });

  it('o carrinho de Vendas vai numa chamada só, sem preço, com a chave e o token', async () => {
    await entrarComoAna();
    await clicar(aba(/^Vendas$/));
    expect(feitas('GET', '/produtos')).toHaveLength(1);

    const mais = Array.from(container.querySelectorAll('button')).find((b) => b.querySelector('.lucide-plus') !== null)!;
    await clicar(mais);
    await clicar(mais);
    await clicar(porTexto('button', /Registrar 1 item/));

    const [venda] = feitas('POST', '/vendas');
    expect(venda?.auth).toBe('Bearer 9|ana');
    expect(venda?.corpo).toEqual({ chave: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown, itens: [{ produto_id: 3, quantidade: 2 }] });
    expect(feitas('POST', '/vendas')).toHaveLength(1);
  });

  it('repetir o carrinho depois de falha de rede reaproveita a MESMA chave (não vende em dobro)', async () => {
    await entrarComoAna();
    await clicar(aba(/^Vendas$/));
    const mais = Array.from(container.querySelectorAll('button')).find((b) => b.querySelector('.lucide-plus') !== null)!;
    await clicar(mais);

    vendaFalhaNaRede = true;
    await clicar(porTexto('button', /Registrar 1 item/));
    await clicar(porTexto('button', /Registrar 1 item/));

    const chaves = feitas('POST', '/vendas').map((c) => (c.corpo as { chave: string }).chave);
    expect(chaves).toHaveLength(2);
    expect(chaves[0]).toBe(chaves[1]);
  });
});
