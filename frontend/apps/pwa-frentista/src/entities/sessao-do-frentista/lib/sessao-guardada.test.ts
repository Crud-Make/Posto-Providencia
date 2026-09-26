import { beforeEach, describe, expect, it } from 'vitest';
import { CHAVE_SESSAO, esquecerSessao, guardarSessao, sessaoDoAparelho, sessaoGuardada } from './sessao-guardada';

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
