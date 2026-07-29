import { describe, it, expect } from 'vitest';
import { paraIsoLocal, deIsoLocal, formatarDataBR, formatarPeriodo } from './periodo';

describe('periodo', () => {
  it('converte Date para ISO local sem pular o dia à noite (GMT-3)', () => {
    // 29/07/2026 22h local: em UTC já é dia 30. É exatamente o caso que
    // `toISOString().split('T')[0]` erra e que motivou estes helpers.
    const noite = new Date(2026, 6, 29, 22, 0, 0);
    expect(paraIsoLocal(noite)).toBe('2026-07-29');
  });

  it('lê ISO local como data local, não como UTC', () => {
    const d = deIsoLocal('2026-07-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
  });

  it('formata data no padrão brasileiro com zero à esquerda', () => {
    expect(formatarDataBR('2026-07-01')).toBe('01/07/2026');
  });

  it('mostra só a data quando o período é de um dia', () => {
    expect(formatarPeriodo({ inicio: '2026-07-29', fim: '2026-07-29' })).toBe('29/07/2026');
  });

  it('omite o ano da primeira ponta quando o período fica no mesmo ano', () => {
    expect(formatarPeriodo({ inicio: '2026-07-01', fim: '2026-07-29' })).toBe('01/07 – 29/07/2026');
  });

  it('mantém os dois anos quando o período cruza a virada', () => {
    expect(formatarPeriodo({ inicio: '2025-12-28', fim: '2026-01-03' })).toBe('28/12/2025 – 03/01/2026');
  });
});
