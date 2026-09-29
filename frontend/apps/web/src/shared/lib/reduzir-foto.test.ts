import { describe, expect, it } from 'vitest';
import { primeiraQueCabe, reduzirFoto } from './reduzir-foto';

/** A foto da fachada desce de qualidade em degraus até caber no limite do servidor (27/09/2026). */
describe('reduzir-foto', () => {
  it('fica com a MELHOR qualidade que cabe', () => {
    const tentadas: number[] = [];
    const gerar = (q: number) => {
      tentadas.push(q);
      return 'x'.repeat(Math.round(q * 1000));
    };
    expect(primeiraQueCabe(gerar, 650)).toBe('x'.repeat(600));
    expect(tentadas).toEqual([0.82, 0.7, 0.6]);
  });

  it('nem a pior qualidade cabe: null', () => {
    expect(primeiraQueCabe(() => 'x'.repeat(500), 100)).toBeNull();
  });

  it('arquivo que não é imagem é recusado antes de abrir', async () => {
    const r = await reduzirFoto(new File(['oi'], 'nota.txt', { type: 'text/plain' }), 300_000);
    expect(r.isErr() && r.error.tipo).toBe('nao_e_imagem');
  });
});
