import { describe, expect, it } from 'vitest';
import { fotoDoPosto, fraseDoDia, iniciaisDoPosto, saudacao, variaveisDoTema } from './escolha-de-posto-estilo';

describe('fraseDoDia', () => {
  it('a mesma frase o dia inteiro, outra no dia seguinte', () => {
    const manha = new Date(2026, 8, 27, 7, 0);
    const noite = new Date(2026, 8, 27, 22, 0);
    const amanha = new Date(2026, 8, 28, 7, 0);
    expect(fraseDoDia(manha)).toBe(fraseDoDia(noite));
    expect(fraseDoDia(amanha)).not.toBe(fraseDoDia(manha));
  });

  it('nunca volta vazia, em nenhum dia do mês', () => {
    for (let dia = 1; dia <= 31; dia += 1) {
      expect(fraseDoDia(new Date(2026, 0, dia)).length).toBeGreaterThan(10);
    }
  });
});

describe('saudacao', () => {
  it('bom dia, boa tarde e boa noite pela hora, com o primeiro nome', () => {
    expect(saudacao(new Date(2026, 8, 27, 8), 'Elias Santos')).toBe('Bom dia, Elias');
    expect(saudacao(new Date(2026, 8, 27, 13), 'Elias')).toBe('Boa tarde, Elias');
    expect(saudacao(new Date(2026, 8, 27, 19), 'Elias')).toBe('Boa noite, Elias');
  });

  it('sem nome, só a saudação', () => {
    expect(saudacao(new Date(2026, 8, 27, 8), '  ')).toBe('Bom dia');
  });
});

describe('iniciaisDoPosto e fotoDoPosto', () => {
  it('nome curto fica inteiro; nome longo vira a inicial', () => {
    expect(iniciaisDoPosto('Posto BR')).toBe('BR');
    expect(iniciaisDoPosto('Posto Jorro')).toBe('J');
  });

  it('só o Jorro (posto 1) tem foto por enquanto', () => {
    expect(fotoDoPosto(1)).toBe('/fundo-login.jpg');
    expect(fotoDoPosto(2)).toBeNull();
  });
});

describe('variaveisDoTema', () => {
  it('claro e escuro trazem o mesmo conjunto de variáveis', () => {
    expect(Object.keys(variaveisDoTema('dark')).sort()).toEqual(Object.keys(variaveisDoTema('light')).sort());
  });
});
