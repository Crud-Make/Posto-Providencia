import { describe, expect, it } from 'vitest';
import { postoParaEntrar } from './posto-para-entrar';

const JORRO = { id: 1, nome: 'Posto Jorro' };
const BR = { id: 2, nome: 'Posto BR' };

describe('postoParaEntrar — o aparelho só entra sem perguntar com UM posto ativo (#101, 27/09)', () => {
  it('um posto só: entra nele', () => {
    expect(postoParaEntrar([BR])).toBe(BR);
  });

  it('dois ou mais postos, ou nenhum: pergunta (null)', () => {
    expect(postoParaEntrar([JORRO, BR])).toBeNull();
    expect(postoParaEntrar([])).toBeNull();
  });
});
