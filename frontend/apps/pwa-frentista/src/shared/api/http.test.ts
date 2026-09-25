import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { postarNaApi } from './http';

// O Result é lido com `.match` no próprio ponto da chamada: o `neverthrow/must-use-result` não
// aceita passá-lo a um ajudante nem `_unsafeUnwrap*` (ver executar.test.ts).

/**
 * A borda HTTP com a API Laravel (#101): toda falha vira `Err` com o tipo certo, e o corpo sai em
 * JSON com o Bearer só quando há token.
 */
const resposta = (status: number, corpo: unknown): Response =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

describe('postarNaApi', () => {
  const fetchFalso = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste/');
    vi.stubGlobal('fetch', fetchFalso);
    fetchFalso.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('manda POST em JSON, com Bearer, e valida a resposta', async () => {
    fetchFalso.mockResolvedValue(resposta(201, { id: 7 }));

    const r = await postarNaApi('/api/x', { valor: '1.00' }, 'tok', z.object({ id: z.number() })).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toEqual({ ok: { id: 7 } });
    const [url, init] = fetchFalso.mock.calls[0] ?? [];
    expect(url).toBe('http://api.teste/api/x');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"valor":"1.00"}');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
  });

  it('sem token não manda Authorization', async () => {
    fetchFalso.mockResolvedValue(resposta(200, { id: 1 }));

    await postarNaApi('/api/x', {}, null, z.object({ id: z.number() })).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(fetchFalso.mock.calls[0]?.[1].headers).not.toHaveProperty('Authorization');
  });

  it('204 chega ao schema como null', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 204 }));

    const r = await postarNaApi('/api/presenca', {}, 'tok', z.null()).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toEqual({ ok: null });
  });

  it('409 com envelope { erro } vira Err api com codigo e mensagem do servidor', async () => {
    fetchFalso.mockResolvedValue(resposta(409, { erro: { codigo: 'ja_enviado', mensagem: 'Já enviou.' } }));

    const r = await postarNaApi('/api/x', {}, 'tok', z.null()).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toEqual({ erro: { tipo: 'api', status: 409, codigo: 'ja_enviado', mensagem: 'Já enviou.' } });
  });

  it('401 com { message } vira Err api sem codigo', async () => {
    fetchFalso.mockResolvedValue(resposta(401, { message: 'Frentista ou PIN incorretos.' }));

    const r = await postarNaApi('/api/x', {}, null, z.null()).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toEqual({ erro: { tipo: 'api', status: 401, codigo: null, mensagem: 'Frentista ou PIN incorretos.' } });
  });

  it('fetch que rejeita vira Err de rede com a causa intacta', async () => {
    const causa = new TypeError('Failed to fetch');
    fetchFalso.mockRejectedValue(causa);

    const r = await postarNaApi('/api/x', {}, null, z.null()).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toMatchObject({ erro: { tipo: 'rede', causa } });
  });

  it('resposta fora do schema vira dado_invalido', async () => {
    fetchFalso.mockResolvedValue(resposta(200, { id: 'sete' }));

    const r = await postarNaApi('/api/x', {}, null, z.object({ id: z.number() })).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toMatchObject({ erro: { tipo: 'dado_invalido' } });
  });

  it('sem VITE_API_URL nem chama a rede', async () => {
    vi.stubEnv('VITE_API_URL', '');

    const r = await postarNaApi('/api/x', {}, null, z.null()).match((ok) => ({ ok }), (erro) => ({ erro }));

    expect(r).toMatchObject({ erro: { tipo: 'api', status: 0, codigo: 'sem_api' } });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
