import { describe, it, expect, vi } from 'vitest';
import { fotoDoPosto, iniciaisDoPosto } from './marca-do-posto';

describe('marca do posto', () => {
  it('sem foto na API, a foto sai do id, sem mapa por posto', () => {
    expect(fotoDoPosto({ id: 1 })).toBe('/postos/1.jpg');
    expect(fotoDoPosto({ id: 42, foto: null })).toBe('/postos/42.jpg');
  });

  it('a foto subida pelo gerente no painel (27/09/2026) vence o arquivo estático', () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    expect(fotoDoPosto({ id: 2, foto: '/api/postos/2/foto?v=5' })).toBe('http://api.test/api/postos/2/foto?v=5');
    vi.unstubAllEnvs();
  });

  it.each([
    ['Posto Jorro', 'J'],
    ['Posto BR', 'BR'],
    ['posto br', 'BR'],
    ['Posto', 'P'],
    ['  Posto  Ipiranga ', 'I'],
    ['Shell', 'S'],
  ])('%s → %s', (nome, esperado) => {
    expect(iniciaisDoPosto(nome)).toBe(esperado);
  });
});
