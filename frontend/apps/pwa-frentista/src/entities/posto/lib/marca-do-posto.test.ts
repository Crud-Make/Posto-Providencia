import { describe, it, expect } from 'vitest';
import { fotoDoPosto, iniciaisDoPosto } from './marca-do-posto';

describe('marca do posto', () => {
  it('a foto sai do id, sem mapa por posto', () => {
    expect(fotoDoPosto(1)).toBe('/postos/1.jpg');
    expect(fotoDoPosto(42)).toBe('/postos/42.jpg');
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
