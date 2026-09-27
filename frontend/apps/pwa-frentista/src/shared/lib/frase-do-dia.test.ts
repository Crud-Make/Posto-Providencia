import { describe, it, expect } from 'vitest';
import { fraseDoDia, saudacao } from './frase-do-dia';

describe('frase do dia', () => {
  it('é a mesma o dia inteiro e muda no dia seguinte', () => {
    const manha = fraseDoDia(new Date(2026, 8, 27, 6));
    expect(fraseDoDia(new Date(2026, 8, 27, 23, 59))).toBe(manha);
    expect(manha).toBe('Atendimento bom faz o cliente voltar, e voltar de novo.');
    expect(fraseDoDia(new Date(2026, 8, 28, 6))).toBe('Pequenos acertos todo dia fazem um mês forte.');
  });

  it('segue a ordem do painel pelo dia do mês', () => {
    expect(fraseDoDia(new Date(2026, 8, 6))).toBe('Cada litro bem medido é lucro que fica em casa.');
    expect(fraseDoDia(new Date(2026, 8, 5))).toBe('Números em dia, decisões seguras.');
  });

  it('saudação pelo horário', () => {
    expect(saudacao(new Date(2026, 8, 27, 11, 59))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 8, 27, 12))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 8, 27, 18))).toBe('Boa noite');
  });
});
