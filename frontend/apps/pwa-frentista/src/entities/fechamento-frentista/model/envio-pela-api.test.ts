import { describe, expect, it } from 'vitest';
import { paraEnvioDaApi, type ValoresDoTurno } from './envio-pela-api';

/**
 * O corpo do envio pela API (#101): os MESMOS valores do payload do Supabase, em string decimal
 * com duas casas. Nenhuma conta nova — só a forma do contrato.
 */
describe('paraEnvioDaApi', () => {
  const valores: ValoresDoTurno = {
    encerrante: 1000,
    valor_pix: 300,
    valor_dinheiro: 0.1 + 0.2,
    valor_moedas: 0,
    baratao: 0,
    valor_nota: 0,
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_cartao: 0,
    valor_conferido: 300.3,
    diferenca_calculada: 699.7,
    observacoes: 'Fechamento via PWA Frentista',
  };

  it('converte cada número em string com duas casas e leva data, chave e observações', () => {
    expect(paraEnvioDaApi('2026-09-24', 'chave-1', valores)).toEqual({
      data: '2026-09-24',
      chave: 'chave-1',
      encerrante: '1000.00',
      valor_pix: '300.00',
      valor_dinheiro: '0.30',
      valor_moedas: '0.00',
      baratao: '0.00',
      valor_nota: '0.00',
      valor_cartao_debito: '0.00',
      valor_cartao_credito: '0.00',
      valor_cartao: '0.00',
      valor_conferido: '300.30',
      diferenca_calculada: '699.70',
      observacoes: 'Fechamento via PWA Frentista',
    });
  });

  it('sobra (diferença negativa) sai com sinal', () => {
    expect(paraEnvioDaApi('2026-09-24', 'c', { ...valores, diferenca_calculada: -49.5 }).diferenca_calculada).toBe('-49.50');
  });

  it('não leva fechamento_id, frentista_id nem posto_id: o servidor decide os três', () => {
    const corpo = paraEnvioDaApi('2026-09-24', 'c', valores);

    expect(corpo).not.toHaveProperty('fechamento_id');
    expect(corpo).not.toHaveProperty('frentista_id');
    expect(corpo).not.toHaveProperty('posto_id');
  });
});
