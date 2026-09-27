import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * A escolha do posto no PWA do frentista (#101, decisão do dono de 27/09/2026): o posto é escolhido
 * NA HORA, toda vez que o app abre — nada fica guardado. Com a API ligada, a porta lê
 * `GET /api/postos` e só depois monta o app, que lê tudo do posto ESCOLHIDO. A sessão de PIN
 * guardada só continua se foi aberta no posto escolhido agora. O dublê é só o `fetch`; o Supabase
 * reprova se for tocado.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@frentista/shared/api/supabase', () => {
  const tocar = (): never => { throw new Error('o Supabase não pode ser chamado com a API ligada'); };
  return { supabase: { from: tocar, functions: { invoke: tocar } } };
});

const App = (await import('./App')).default;

const JORRO = { id: 1, nome: 'Posto Jorro' };
const BR = { id: 2, nome: 'Posto BR' };
const sessaoNoPosto = (postoId?: number): string => JSON.stringify({
  token: '9|ana', vence_em: '2999-01-01T00:00:00Z', frentista: { id: 7, nome: 'Ana' },
  ...(postoId === undefined ? {} : { posto_id: postoId }),
});

let postosDaApi: { id: number; nome: string }[] = [];
const urls: string[] = [];

const json = (status: number, corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

const fetchFalso = vi.fn(async (url: string): Promise<Response> => {
  urls.push(url);
  const caminho = new URL(url).pathname;
  if (caminho === '/api/postos') return json(200, { data: postosDaApi });
  if (caminho.endsWith('/frentistas/escolha')) return json(200, { data: [{ id: 7, nome: 'Ana', tem_chave: true }] });
  return json(404, { message: `sem rota ${caminho}` });
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const texto = (): string => container?.textContent ?? '';
const botao = (rotulo: string): HTMLButtonElement | undefined =>
  Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === rotulo);
const lidas = (trecho: string): string[] => urls.filter((u) => u.includes(trecho));

const esperar = async () => {
  for (let i = 0; i < 50 && texto().includes('Carregando os postos'); i += 1) {
    await act(async () => { await new Promise((fim) => setTimeout(fim, 0)); });
  }
};

const fechar = () => {
  if (root !== null) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
};

const abrir = async () => {
  fechar();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root?.render(React.createElement(App)); });
  await esperar();
};

const clicar = async (el: Element | undefined) => {
  expect(el).toBeDefined();
  await act(async () => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await esperar();
};

describe('PWA do frentista: posto escolhido na hora (#101, 27/09/2026)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste');
    vi.stubEnv('VITE_API_PWA', '1');
    vi.stubGlobal('fetch', fetchFalso);
    urls.length = 0;
    postosDaApi = [JORRO, BR];
    localStorage.clear();
  });

  afterEach(() => {
    fechar();
    vi.restoreAllMocks();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('pergunta "Escolha o posto" com os postos ativos da API, antes de ler qualquer frentista', async () => {
    await abrir();

    expect(texto()).toContain('Escolha o posto para começar');
    expect(botao('Posto Jorro')).toBeDefined();
    expect(botao('Posto BR')).toBeDefined();
    expect(urls).toEqual(['http://api.teste/api/postos']);
  });

  it('escolher segue para os frentistas DAQUELE posto, e nada do posto fica guardado', async () => {
    await abrir();

    await clicar(botao('Posto BR'));

    expect(texto()).not.toContain('Escolha o posto para começar');
    expect(lidas('/api/postos/2/frentistas/escolha')).toHaveLength(1);
    expect(lidas('/api/postos/1/')).toHaveLength(0);
    expect(localStorage.getItem('pwa.posto')).toBeNull();
  });

  it('reabrir o app pergunta de novo', async () => {
    await abrir();
    await clicar(botao('Posto BR'));

    await abrir();

    expect(texto()).toContain('Escolha o posto para começar');
  });

  it('com um só posto ativo, entra direto nele e não oferece troca', async () => {
    postosDaApi = [BR];

    await abrir();

    expect(texto()).not.toContain('Escolha o posto para começar');
    expect(texto()).toContain('Posto BR');
    expect(lidas('/api/postos/2/frentistas/escolha')).toHaveLength(1);
    expect(botao('Trocar posto')).toBeUndefined();
  });

  it('a sessão de PIN aberta NO posto escolhido continua valendo', async () => {
    localStorage.setItem('pwa.sessaoFrentista', sessaoNoPosto(2));
    localStorage.setItem('pwa.frentista', JSON.stringify({ id: 7, nome: 'Ana' }));
    await abrir();

    await clicar(botao('Posto BR'));

    expect(localStorage.getItem('pwa.sessaoFrentista')).toBe(sessaoNoPosto(2));
    expect(localStorage.getItem('pwa.frentista')).not.toBeNull();
  });

  it('a sessão de OUTRO posto é descartada ao escolher, junto com o frentista selecionado', async () => {
    localStorage.setItem('pwa.sessaoFrentista', sessaoNoPosto(1));
    localStorage.setItem('pwa.frentista', JSON.stringify({ id: 7, nome: 'Ana' }));
    await abrir();

    await clicar(botao('Posto BR'));

    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
    expect(localStorage.getItem('pwa.frentista')).toBeNull();
  });

  it('a sessão guardada antes de levar o posto (sem posto_id) é descartada', async () => {
    localStorage.setItem('pwa.sessaoFrentista', sessaoNoPosto());
    await abrir();

    await clicar(botao('Posto Jorro'));

    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
  });

  it('trocar de posto encerra a sessão de PIN e o frentista do aparelho, e volta à escolha', async () => {
    localStorage.setItem('pwa.sessaoFrentista', sessaoNoPosto(2));
    localStorage.setItem('pwa.frentista', JSON.stringify({ id: 7, nome: 'Ana' }));
    await abrir();
    await clicar(botao('Posto BR'));
    expect(texto()).toContain('Posto BR');

    await clicar(botao('Trocar posto'));

    expect(texto()).toContain('Escolha o posto para começar');
    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
    expect(localStorage.getItem('pwa.frentista')).toBeNull();
  });

  it('localStorage que lança (aba anônima, cheio) não quebra: pergunta, e a escolha segue na tela', async () => {
    const bloqueado = (): never => { throw new Error('armazenamento bloqueado'); };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(bloqueado);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(bloqueado);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(bloqueado);

    await abrir();
    expect(texto()).toContain('Escolha o posto para começar');

    await clicar(botao('Posto BR'));

    expect(texto()).not.toContain('Escolha o posto para começar');
    expect(lidas('/api/postos/2/frentistas/escolha')).toHaveLength(1);
  });
});
