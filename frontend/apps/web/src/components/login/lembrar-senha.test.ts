import { afterEach, describe, expect, it, vi } from 'vitest';
import { lembrarSenhaNoNavegador } from './lembrar-senha';

/** "Lembrar a senha" entrega o login ao cofre do navegador e nunca barra a entrada. */

class CredencialFalsa {
  constructor(readonly dados: { id: string; password: string }) {}
}

function comApi(store: (c: unknown) => Promise<unknown>): void {
  vi.stubGlobal('PasswordCredential', CredencialFalsa);
  vi.stubGlobal('navigator', { ...navigator, credentials: { store } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lembrarSenhaNoNavegador', () => {
  it('entrega e-mail e senha ao gerenciador do navegador', async () => {
    const store = vi.fn<(c: unknown) => Promise<unknown>>(async () => Promise.resolve(undefined));
    comApi(store);

    expect(await lembrarSenhaNoNavegador('elias@posto.local', 's3nh4')).toBe(true);
    expect(store).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledWith(expect.objectContaining({ dados: { id: 'elias@posto.local', password: 's3nh4' } }));
  });

  it('sem a API (Firefox, Safari) não faz nada e devolve false', async () => {
    vi.stubGlobal('PasswordCredential', undefined);

    expect(await lembrarSenhaNoNavegador('elias@posto.local', 's3nh4')).toBe(false);
  });

  it('se o navegador recusar, devolve false em vez de lançar', async () => {
    comApi(async () => Promise.reject(new Error('recusado')));

    expect(await lembrarSenhaNoNavegador('elias@posto.local', 's3nh4')).toBe(false);
  });
});
