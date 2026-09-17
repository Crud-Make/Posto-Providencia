/**
 * Os modos são a regra de seleção do calendário — a parte que varia. Testar aqui é o que
 * permite trocar o desenho do componente sem medo: o comportamento vive nestes objetos.
 */
import { describe, it, expect } from 'vitest';
import { modoDia, modoMes, modoIntervalo } from './modos';
import { hojeIso, paraMesLocal } from '@/utils/periodo';

describe('modoDia', () => {
  it('fecha a seleção no primeiro clique', () => {
    expect(modoDia.selecionar('2026-07-15', null)).toEqual({
      tipo: 'concluida',
      valor: '2026-07-15',
    });
  });

  it('pinta só o dia escolhido', () => {
    expect(modoDia.intervaloPintado('2026-07-15', null, null)).toEqual({
      inicio: '2026-07-15',
      fim: '2026-07-15',
    });
  });

  it('formata o rótulo em pt-BR', () => {
    expect(modoDia.rotulo('2026-07-15')).toBe('15/07/2026');
  });

  it('abre no mês do valor, e em hoje quando não há valor', () => {
    expect(modoDia.ancora('2026-01-09')).toBe('2026-01-09');
    expect(modoDia.ancora('')).toBe(hojeIso());
  });

  it('usa a grade de dias', () => {
    expect(modoDia.grade).toBe('dias');
  });
});

describe('modoMes', () => {
  it('trabalha na granularidade aaaa-mm', () => {
    expect(modoMes.grade).toBe('meses');
    expect(modoMes.selecionar('2026-03', null)).toEqual({ tipo: 'concluida', valor: '2026-03' });
    expect(modoMes.intervaloPintado('2026-03', null, null)).toEqual({
      inicio: '2026-03',
      fim: '2026-03',
    });
  });

  it('formata o rótulo como Mês/Ano', () => {
    expect(modoMes.rotulo('2026-03')).toBe('Março/2026');
  });

  it('o atalho Hoje devolve o mês corrente', () => {
    expect(modoMes.hoje()).toBe(paraMesLocal(new Date()));
  });
});

describe('modoIntervalo', () => {
  it('o primeiro clique não fecha, o segundo fecha', () => {
    const primeiro = modoIntervalo.selecionar('2026-07-10', null);
    expect(primeiro).toEqual({ tipo: 'parcial', ancora: '2026-07-10' });

    const segundo = modoIntervalo.selecionar('2026-07-20', '2026-07-10');
    expect(segundo).toEqual({
      tipo: 'concluida',
      valor: { inicio: '2026-07-10', fim: '2026-07-20' },
    });
  });

  it('ordena as pontas quando o clique vem de trás para a frente', () => {
    expect(modoIntervalo.selecionar('2026-07-10', '2026-07-20')).toEqual({
      tipo: 'concluida',
      valor: { inicio: '2026-07-10', fim: '2026-07-20' },
    });
  });

  it('dois cliques no mesmo dia valem como dia único', () => {
    expect(modoIntervalo.selecionar('2026-07-10', '2026-07-10')).toEqual({
      tipo: 'concluida',
      valor: { inicio: '2026-07-10', fim: '2026-07-10' },
    });
  });

  it('sem seleção em andamento, pinta o valor aplicado', () => {
    const periodo = { inicio: '2026-07-01', fim: '2026-07-31' };
    expect(modoIntervalo.intervaloPintado(periodo, null, null)).toEqual(periodo);
  });

  it('com seleção em andamento, a prévia segue o cursor', () => {
    const periodo = { inicio: '2026-07-01', fim: '2026-07-31' };
    expect(modoIntervalo.intervaloPintado(periodo, '2026-07-10', '2026-07-14')).toEqual({
      inicio: '2026-07-10',
      fim: '2026-07-14',
    });
    // Cursor antes da âncora: a prévia inverte, não fica vazia.
    expect(modoIntervalo.intervaloPintado(periodo, '2026-07-10', '2026-07-05')).toEqual({
      inicio: '2026-07-05',
      fim: '2026-07-10',
    });
    // Cursor fora da grade: pinta só a âncora.
    expect(modoIntervalo.intervaloPintado(periodo, '2026-07-10', null)).toEqual({
      inicio: '2026-07-10',
      fim: '2026-07-10',
    });
  });

  it('a dica muda conforme a ponta que falta', () => {
    expect(modoIntervalo.dica(null)).toBe('Clique no dia inicial');
    expect(modoIntervalo.dica('2026-07-10')).toBe('Agora clique no dia final');
  });

  it('o atalho Hoje colapsa o período em um dia', () => {
    const hoje = hojeIso();
    expect(modoIntervalo.hoje()).toEqual({ inicio: hoje, fim: hoje });
  });
});
