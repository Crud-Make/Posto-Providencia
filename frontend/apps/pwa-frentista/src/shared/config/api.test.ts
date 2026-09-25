import { afterEach, describe, expect, it, vi } from 'vitest';
import { pwaPelaApiLigado, urlDaApi } from './api';

/** A flag do PWA pela API (#101): liga só com as DUAS variáveis. Sem elas, o Supabase de sempre. */
describe('pwaPelaApiLigado', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it.each([
    ['http://api', '1', true],
    ['http://api', 'true', true],
    ['http://api', ' TRUE ', true],
    ['http://api', '0', false],
    ['http://api', '', false],
    ['', '1', false],
    ['   ', '1', false],
  ])('VITE_API_URL=%j e VITE_API_PWA=%j → %s', (url, flag, esperado) => {
    vi.stubEnv('VITE_API_URL', url);
    vi.stubEnv('VITE_API_PWA', flag);

    expect(pwaPelaApiLigado()).toBe(esperado);
  });

  it('urlDaApi tira a barra do fim', () => {
    vi.stubEnv('VITE_API_URL', ' http://api.teste// ');

    expect(urlDaApi()).toBe('http://api.teste');
  });
});
