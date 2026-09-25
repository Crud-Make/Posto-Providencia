import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * O PWA com a API ligada (#101, fatia 1): `VITE_API_URL` + `VITE_API_PWA=1`.
 *
 * O dublê é o `fetch` (a API Laravel), não a fachada: o caminho real `App → services/api →
 * entities → shared/api/http` roda de ponta a ponta. Da fachada só se trocam as LEITURAS que
 * continuam no Supabase (lista de frentistas, envios do dia) e as duas escritas do caminho antigo,
 * para provar que elas NÃO são chamadas com a flag ligada.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  getOrCreateFechamento: vi.fn(async () => 1),
  submitFrentistaClosing: vi.fn(async () => ({})),
}));

vi.mock('./services/api', async (importOriginal) => {
  const real = await importOriginal<typeof import('./services/api')>();
  return {
    api: {
      ...real.api,
      getFrentistas: async () => [{ id: 7, nome: 'Ana' }],
      getEnviosDoDia: async () => [],
      getOrCreateFechamento: mocks.getOrCreateFechamento,
      submitFrentistaClosing: mocks.submitFrentistaClosing,
      getHistoricoFrentista: async () => [],
      getProdutos: async () => [],
    },
  };
});

const App = (await import('./App')).default;
const { hojeIso } = await import('@posto/utils');

type Chamada = { url: string; corpo: unknown; auth: string | null };
const chamadas: Chamada[] = [];
let respostaDoEnvio: () => Response;

const json = (status: number, corpo: unknown): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

const fetchFalso = vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
  const cabecalhos = new Headers(init.headers);
  chamadas.push({ url, corpo: JSON.parse(String(init.body)) as unknown, auth: cabecalhos.get('Authorization') });
  if (url.endsWith('/frentistas/entrar')) {
    return json(200, { token: '9|posto_segredo', vence_em: '2999-01-01T00:00:00Z', frentista: { id: 7, nome: 'Ana' } });
  }
  if (url.endsWith('/presenca')) return new Response(null, { status: 204 });
  return respostaDoEnvio();
});

const envioAceito = (): Response => json(201, {
  data: {
    id: 55, fechamento_id: 3, frentista_id: 7, data_hora_envio: '2026-09-24T12:00:00Z', repetido: false,
    consolidacao: { apurado: false, total_vendas: null, total_recebido: '1000.00', diferenca: null },
  },
});

let container: HTMLDivElement;
let root: Root;

const clicar = async (el: Element) => {
  await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const digitar = async (input: HTMLInputElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const porTexto = (seletor: string, texto: RegExp): HTMLElement =>
  Array.from(container.querySelectorAll<HTMLElement>(seletor)).find((el) => texto.test(el.textContent ?? ''))!;
const campos = (): HTMLInputElement[] => Array.from(container.querySelectorAll<HTMLInputElement>('input[placeholder="0,00"]'));
const campoPin = (): HTMLInputElement | null => container.querySelector<HTMLInputElement>('input[aria-label="PIN"]');

const escolherAna = async () => {
  await clicar(porTexto('span', /Selecionar Frentista/));
  await clicar(porTexto('span', /^Ana$/));
};

const entrarComPin = async (pin: string) => {
  await digitar(campoPin()!, pin);
  await act(async () => {
    campoPin()!.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};

describe('PWA do frentista com a API ligada (#101)', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste');
    vi.stubEnv('VITE_API_PWA', '1');
    vi.stubGlobal('fetch', fetchFalso);
    chamadas.length = 0;
    respostaDoEnvio = envioAceito;
    mocks.getOrCreateFechamento.mockClear();
    mocks.submitFrentistaClosing.mockClear();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(React.createElement(App)); });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('escolher o frentista pede o PIN; só depois do PIN ele vira o selecionado', async () => {
    await escolherAna();

    expect(campoPin()).not.toBeNull();
    expect(container.textContent).toContain('Selecionar Frentista');

    await entrarComPin('4821');

    expect(chamadas[0]).toEqual({ url: 'http://api.teste/api/postos/1/frentistas/entrar', corpo: { frentista_id: 7, pin: '4821' }, auth: null });
    expect(campoPin()).toBeNull();
    expect(container.textContent).not.toContain('Selecionar Frentista');
    // O sinal de vida já sai pela API, com o token da sessão.
    expect(chamadas.some((c) => c.url.endsWith('/api/postos/1/presenca') && c.auth === 'Bearer 9|posto_segredo')).toBe(true);
  });

  it('o envio vai para a API com o token e os valores em string; o caminho do Supabase não é chamado', async () => {
    await escolherAna();
    await entrarComPin('4821');
    await digitar(campos()[0]!, '100000');
    await digitar(campos()[1]!, '30000');
    await digitar(campos()[2]!, '70000');

    await clicar(porTexto('button', /Enviar Registro/));

    const envio = chamadas.find((c) => c.url.endsWith('/envios'));
    expect(envio?.auth).toBe('Bearer 9|posto_segredo');
    expect(envio?.corpo).toMatchObject({
      data: hojeIso(),
      encerrante: '1000.00', valor_pix: '300.00', valor_dinheiro: '700.00', valor_moedas: '0.00', baratao: '0.00',
      valor_nota: '0.00', valor_cartao_debito: '0.00', valor_cartao_credito: '0.00', valor_cartao: '0.00',
      valor_conferido: '1000.00', diferenca_calculada: '0.00', observacoes: 'Fechamento via PWA Frentista',
    });
    expect(envio?.corpo).not.toHaveProperty('frentista_id');
    expect(envio?.corpo).toMatchObject({ chave: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown });
    expect(mocks.getOrCreateFechamento).not.toHaveBeenCalled();
    expect(mocks.submitFrentistaClosing).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Registro de Turno enviado com sucesso!');
  });

  it('repetir o envio depois de falha de rede reaproveita a MESMA chave (idempotência)', async () => {
    await escolherAna();
    await entrarComPin('4821');
    await digitar(campos()[0]!, '100000');
    await digitar(campos()[2]!, '100000');
    respostaDoEnvio = () => { throw new TypeError('Failed to fetch'); };

    await clicar(porTexto('button', /Enviar Registro/));
    await clicar(porTexto('button', /^OK$/));
    respostaDoEnvio = envioAceito;
    await clicar(porTexto('button', /Enviar Registro/));

    const chaves = chamadas.filter((c) => c.url.endsWith('/envios')).map((c) => (c.corpo as { chave: string }).chave);
    expect(chaves).toHaveLength(2);
    expect(chaves[0]).toBe(chaves[1]);
  });

  it('409 ja_enviado mostra a mensagem do servidor', async () => {
    respostaDoEnvio = () => json(409, { erro: { codigo: 'ja_enviado', mensagem: 'Este frentista já enviou o fechamento de 24/09/2026.' } });
    await escolherAna();
    await entrarComPin('4821');
    await digitar(campos()[0]!, '100000');

    await clicar(porTexto('button', /Enviar Registro/));

    expect(container.textContent).toContain('Este frentista já enviou o fechamento de 24/09/2026.');
  });

  it('401 no envio (sessão vencida) apaga a sessão e pede o PIN de novo, sem perder os valores', async () => {
    respostaDoEnvio = () => json(401, { message: 'Token inválido.' });
    await escolherAna();
    await entrarComPin('4821');
    await digitar(campos()[0]!, '100000');

    await clicar(porTexto('button', /Enviar Registro/));

    expect(localStorage.getItem('pwa.sessaoFrentista')).toBeNull();
    expect(campoPin()).not.toBeNull();
    expect(campos()[0]!.value).not.toBe('');
  });
});
