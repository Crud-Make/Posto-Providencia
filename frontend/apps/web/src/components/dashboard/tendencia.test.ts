import { describe, expect, it } from 'vitest';
import { periodoAnterior, rotuloDaComparacao, variacao } from './tendencia';

describe('variacao', () => {
  it('subiu, caiu e ficou igual', () => {
    expect(variacao(1120, 1000)).toEqual({ texto: '+12%', negativa: false });
    expect(variacao(950, 1000)).toEqual({ texto: '-5%', negativa: true });
    expect(variacao(1000, 1000)).toEqual({ texto: '0%', negativa: false });
  });

  it('uma casa decimal quando não é inteira, com vírgula', () => {
    expect(variacao(1125, 1000).texto).toBe('+12,5%');
    expect(variacao(2, 3).texto).toBe('-33,3%');
  });

  it('sem base de comparação é "—", nunca um número inventado', () => {
    expect(variacao(500, 0)).toEqual({ texto: '—', negativa: false });
    expect(variacao(null, 100).texto).toBe('—');
    expect(variacao(100, null).texto).toBe('—');
    expect(variacao(undefined, 100).texto).toBe('—');
  });

  it('os dois zero: 0%', () => {
    expect(variacao(0, 0).texto).toBe('0%');
  });

  it('lucro negativo como base: a direção segue o valor, não o sinal', () => {
    // De prejuízo de 100 para prejuízo de 50 é melhora: +50%.
    expect(variacao(-50, -100)).toEqual({ texto: '+50%', negativa: false });
  });
});

describe('periodoAnterior', () => {
  it('um dia → a véspera', () => {
    expect(periodoAnterior({ inicio: '2026-09-24', fim: '2026-09-24' })).toEqual({ inicio: '2026-09-23', fim: '2026-09-23' });
  });

  it('atravessa a virada de mês e de ano', () => {
    expect(periodoAnterior({ inicio: '2026-03-01', fim: '2026-03-01' })).toEqual({ inicio: '2026-02-28', fim: '2026-02-28' });
    expect(periodoAnterior({ inicio: '2026-01-01', fim: '2026-01-07' })).toEqual({ inicio: '2025-12-25', fim: '2025-12-31' });
  });

  it('um mês de 30 dias → os 30 dias antes dele', () => {
    expect(periodoAnterior({ inicio: '2026-09-01', fim: '2026-09-30' })).toEqual({ inicio: '2026-08-02', fim: '2026-08-31' });
  });
});

describe('rotuloDaComparacao', () => {
  it('hoje → "vs. ontem"; outro dia → "vs. dia anterior"; intervalo → "vs. período anterior"', () => {
    expect(rotuloDaComparacao({ inicio: '2026-09-24', fim: '2026-09-24' }, '2026-09-24')).toBe('vs. ontem');
    expect(rotuloDaComparacao({ inicio: '2026-09-20', fim: '2026-09-20' }, '2026-09-24')).toBe('vs. dia anterior');
    expect(rotuloDaComparacao({ inicio: '2026-09-01', fim: '2026-09-24' }, '2026-09-24')).toBe('vs. período anterior');
  });
});
