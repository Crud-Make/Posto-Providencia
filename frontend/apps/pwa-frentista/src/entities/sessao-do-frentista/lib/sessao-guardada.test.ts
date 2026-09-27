import { beforeEach, describe, expect, it } from 'vitest';
import { CHAVE_SESSAO, esquecerSessao, guardarSessao, sessaoDoAparelho, sessaoEhDoPosto, sessaoGuardada } from './sessao-guardada';

/** A sessão do frentista no aparelho (#101): só vale para o MESMO frentista e até vencer. */
describe('sessaoGuardada', () => {
  const agora = Date.parse('2026-09-24T12:00:00Z');
  const sessao = { token: '1|posto_x', vence_em: '2026-09-25T02:00:00Z', frentista: { id: 7, nome: 'Ana' } };

  beforeEach(() => { localStorage.clear(); });

  it('devolve a sessão guardada do mesmo frentista, antes de vencer', () => {
    guardarSessao(sessao);

    expect(sessaoGuardada(7, agora)).toEqual(sessao);
  });

  it('outro frentista no aparelho: null (o PIN do novo é pedido)', () => {
    guardarSessao(sessao);

    expect(sessaoGuardada(8, agora)).toBeNull();
  });

  it('vencida: null', () => {
    guardarSessao(sessao);

    expect(sessaoGuardada(7, Date.parse('2026-09-25T02:00:00Z'))).toBeNull();
  });

  it('texto malformado ou fora do formato: null, sem lançar', () => {
    localStorage.setItem(CHAVE_SESSAO, '{quebrado');
    expect(sessaoGuardada(7, agora)).toBeNull();

    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: '', vence_em: 'x', frentista: { id: 7 } }));
    expect(sessaoGuardada(7, agora)).toBeNull();
  });

  it('esquecer apaga', () => {
    guardarSessao(sessao);
    esquecerSessao();

    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('sessaoDoAparelho: a de quem entrou, qualquer frentista, só antes de vencer (fatia 2)', () => {
    expect(sessaoDoAparelho(agora)).toBeNull();
    guardarSessao(sessao);

    expect(sessaoDoAparelho(agora)).toEqual(sessao);
    expect(sessaoDoAparelho(Date.parse('2026-09-25T02:00:01Z'))).toBeNull();
  });
});

/** A sessão só vale no posto em que foi aberta (27/09/2026: o posto é escolhido a cada abertura). */
describe('sessaoEhDoPosto', () => {
  const sessao = { token: '1|posto_x', vence_em: '2999-01-01T00:00:00Z', frentista: { id: 7, nome: 'Ana' } };

  beforeEach(() => { localStorage.clear(); });

  it('sem sessão guardada: nada a descartar', () => {
    expect(sessaoEhDoPosto(2)).toBe(true);
  });

  it('sessão aberta no mesmo posto: vale', () => {
    guardarSessao({ ...sessao, posto_id: 2 });
    expect(sessaoEhDoPosto(2)).toBe(true);
  });

  it('sessão de outro posto, ou sem o carimbo de posto (guardada antes dele): não vale', () => {
    guardarSessao({ ...sessao, posto_id: 1 });
    expect(sessaoEhDoPosto(2)).toBe(false);
    guardarSessao(sessao);
    expect(sessaoEhDoPosto(1)).toBe(false);
  });
});
