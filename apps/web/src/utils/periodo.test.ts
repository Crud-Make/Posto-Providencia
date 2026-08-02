import { describe, it, expect } from 'vitest';
import {
  paraIsoLocal,
  deIsoLocal,
  formatarDataBR,
  formatarPeriodo,
  intervaloDoMes,
  ehMesCorrente,
  mesesRecentes,
  formatarMesBR,
} from './periodo';

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

describe('seleção de mês no painel do proprietário', () => {
  const HOJE = '2026-08-02';

  it('fecha o mês passado no último dia dele, não em hoje', () => {
    // O caso que motivou a feature: ver janeiro inteiro estando em agosto.
    expect(intervaloDoMes('2026-01', HOJE)).toEqual({
      inicio: '2026-01-01',
      fim: '2026-01-31',
    });
  });

  it('corta o mês corrente em hoje, não no último dia', () => {
    // Incluir 03..31/08 não muda a soma (não há venda), mas divide a despesa do mês
    // por litros que ainda não existem e afunda o rateio por litro.
    expect(intervaloDoMes('2026-08', HOJE)).toEqual({
      inicio: '2026-08-01',
      fim: '2026-08-02',
    });
  });

  it('respeita o número real de dias de fevereiro', () => {
    expect(intervaloDoMes('2026-02', HOJE).fim).toBe('2026-02-28');
  });

  it('não estoura para o mês seguinte quando hoje é o último dia do mês', () => {
    expect(intervaloDoMes('2026-07', '2026-07-31')).toEqual({
      inicio: '2026-07-01',
      fim: '2026-07-31',
    });
  });

  /**
   * REGRESSÃO DE FUSO (mesma família do painel que apagava às 21h).
   *
   * `intervaloDoMes` é puro e recebe `hoje` já resolvido em ISO local, então não pode
   * reintroduzir o bug — mas o teste fixa o contrato: quem chama passa `hojeIso()`,
   * jamais `toISOString()`. Às 21h37 de 31/07 em GMT-3 o UTC já é 01/08; se esse valor
   * vazasse para cá, julho viraria mês passado e o corte saltaria para agosto.
   */
  it('trata 31/07 como mês corrente de julho, não como agosto', () => {
    expect(ehMesCorrente('2026-07', '2026-07-31')).toBe(true);
    expect(intervaloDoMes('2026-07', '2026-07-31').fim).toBe('2026-07-31');
  });

  it('reconhece o mês corrente e distingue do histórico', () => {
    expect(ehMesCorrente('2026-08', HOJE)).toBe(true);
    expect(ehMesCorrente('2026-01', HOJE)).toBe(false);
  });

  it('lista os meses recentes do mais novo para o mais antigo, cruzando o ano', () => {
    expect(mesesRecentes(HOJE, 3)).toEqual(['2026-08', '2026-07', '2026-06']);
    expect(mesesRecentes('2026-02-10', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11']);
  });

  it('cobre janeiro na lista padrão de 12 meses a partir de agosto', () => {
    expect(mesesRecentes(HOJE, 12)).toContain('2026-01');
  });

  it('formata o mês em português', () => {
    expect(formatarMesBR('2026-01')).toBe('Janeiro/2026');
    expect(formatarMesBR('2026-12')).toBe('Dezembro/2026');
  });
});
