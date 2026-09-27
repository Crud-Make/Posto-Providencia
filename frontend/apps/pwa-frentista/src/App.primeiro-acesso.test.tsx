import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * Primeiro acesso no PWA (#101, decisão do dono de 27/09/2026): cada frentista cria a PRÓPRIA chave.
 * Tocar num nome sem chave (`tem_chave: false`) abre "Crie sua chave"; com chave, o PIN de sempre.
 * Se a lista estava velha e a chave já existe, a API responde 409 e a tela cai no PIN com a
 * mensagem do servidor. O dublê é só o `fetch`; o Supabase reprova se for tocado.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@frentista/shared/api/supabase', () => {
  const tocar = (): never => { throw new Error('o Supabase não pode ser chamado com a API ligada'); };
  return { supabase: { from: tocar, functions: { invoke: tocar } } };
});

const App = (await import('./App')).default;

const JA_TEM = 'Este frentista já tem chave. Peça ao gerente para zerar.';

type Chamada = { url: string; metodo: string; corpo: unknown };
const chamadas: Chamada[] = [];
let respostaDoPrimeiroAcesso: () => Response;

const json = (status: number, corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

const sessaoDe = (id: number, nome: string) => ({ token: `9|${nome}`, vence_em: '2999-01-01T00:00:00Z', frentista: { id, nome } });

const fetchFalso = vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
  const metodo = init.method ?? 'GET';
  chamadas.push({ url, metodo, corpo: init.body === undefined ? undefined : (JSON.parse(String(init.body)) as unknown) });
  const caminho = new URL(url).pathname;
  if (caminho === '/api/postos') return json(200, { data: [{ id: 1, nome: 'Posto Jorro' }] });
  if (caminho.endsWith('/frentistas/escolha')) {
    return json(200, { data: [{ id: 7, nome: 'Ana', tem_chave: false }, { id: 8, nome: 'Bia', tem_chave: true }] });
  }
  if (caminho.endsWith('/frentistas/primeiro-acesso')) return respostaDoPrimeiroAcesso();
  if (caminho.endsWith('/frentistas/entrar')) return json(200, sessaoDe(8, 'Bia'));
  return json(404, { message: `sem rota ${caminho}` });
});

let container: HTMLDivElement;
let root: Root;

const texto = (): string => container.textContent ?? '';
const campo = (rotulo: string): HTMLInputElement | null => container.querySelector<HTMLInputElement>(`input[aria-label="${rotulo}"]`);
const porTexto = (seletor: string, padrao: RegExp): HTMLElement | undefined =>
  Array.from(container.querySelectorAll<HTMLElement>(seletor)).find((el) => padrao.test(el.textContent ?? ''));
const feitas = (trecho: string): Chamada[] => chamadas.filter((c) => c.url.includes(trecho));

const esperar = async () => {
  for (let i = 0; i < 50 && texto().includes('Carregando os postos'); i += 1) {
    await act(async () => { await new Promise((fim) => setTimeout(fim, 0)); });
  }
};
const clicar = async (el: Element | undefined) => {
  expect(el).toBeDefined();
  await act(async () => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const digitar = async (input: HTMLInputElement | null, valor: string) => {
  expect(input).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    if (input !== null) setter?.call(input, valor);
    input?.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const enviar = async (input: HTMLInputElement | null) => {
  await act(async () => { input?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
};
const tocarNoNome = async (nome: RegExp) => {
  await clicar(porTexto('span', /Selecionar Frentista/));
  await clicar(porTexto('span', nome));
};

describe('PWA do frentista: primeiro acesso cria a própria chave (#101, 27/09/2026)', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste');
    vi.stubEnv('VITE_API_PWA', '1');
    vi.stubGlobal('fetch', fetchFalso);
    chamadas.length = 0;
    respostaDoPrimeiroAcesso = () => json(201, sessaoDe(7, 'Ana'));
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(React.createElement(App)); });
    await esperar();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('frentista SEM chave: "Crie sua chave" com dois campos numéricos; criada, já entra, com a sessão do posto', async () => {
    await tocarNoNome(/^Ana$/);

    expect(texto()).toContain('Crie sua chave');
    expect(campo('PIN')).toBeNull();
    expect(campo('Nova chave')?.getAttribute('inputmode')).toBe('numeric');
    expect(campo('Confirme a chave')?.getAttribute('inputmode')).toBe('numeric');

    await digitar(campo('Nova chave'), '2468');
    await digitar(campo('Confirme a chave'), '2468');
    await enviar(campo('Nova chave'));

    expect(feitas('/primeiro-acesso')).toEqual([{
      url: 'http://api.teste/api/postos/1/frentistas/primeiro-acesso',
      metodo: 'POST',
      corpo: { frentista_id: 7, pin: '2468', pin_confirmacao: '2468' },
    }]);
    expect(texto()).not.toContain('Crie sua chave');
    expect(texto()).not.toContain('Selecionar Frentista');
    expect(JSON.parse(localStorage.getItem('pwa.sessaoFrentista') ?? 'null')).toMatchObject({ token: '9|Ana', posto_id: 1 });
  });

  it('frentista COM chave: a tela do PIN de sempre, sem "Crie sua chave"', async () => {
    await tocarNoNome(/^Bia$/);

    expect(campo('PIN')).not.toBeNull();
    expect(texto()).not.toContain('Crie sua chave');

    await digitar(campo('PIN'), '4821');
    await enviar(campo('PIN'));

    expect(feitas('/frentistas/entrar')).toHaveLength(1);
    expect(feitas('/primeiro-acesso')).toHaveLength(0);
  });

  it('409 (a chave já existe): cai na tela do PIN com a mensagem do servidor', async () => {
    respostaDoPrimeiroAcesso = () => json(409, { erro: { codigo: 'ja_tem_chave', mensagem: JA_TEM } });
    await tocarNoNome(/^Ana$/);

    await digitar(campo('Nova chave'), '2468');
    await digitar(campo('Confirme a chave'), '2468');
    await enviar(campo('Nova chave'));

    expect(campo('PIN')).not.toBeNull();
    expect(texto()).toContain(JA_TEM);
    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
  });

  it('as duas chaves diferentes: avisa na tela e nem chama a API', async () => {
    await tocarNoNome(/^Ana$/);

    await digitar(campo('Nova chave'), '2468');
    await digitar(campo('Confirme a chave'), '2469');
    await enviar(campo('Nova chave'));

    expect(texto()).toContain('As duas chaves não são iguais.');
    expect(feitas('/primeiro-acesso')).toHaveLength(0);
  });
});
