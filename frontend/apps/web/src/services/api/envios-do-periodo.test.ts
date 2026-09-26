import { describe, expect, it } from 'vitest';
import type { FechamentoFrentista } from '../../types/database/index';
import { enviosPorFrentista } from './envios-do-periodo';

let proximoId = 0;

/** Envio mínimo: só os baldes e o que a tabela lê. Conferido = dinheiro + pix aqui. Cada envio tem id próprio. */
function envio(frentista: number, fechamento: number, dinheiro: number, pix: number, diferenca: number, observacoes = ''): FechamentoFrentista {
  return {
    id: ++proximoId,
    fechamento_id: fechamento,
    frentista_id: frentista,
    valor_dinheiro: dinheiro,
    valor_pix: pix,
    valor_cartao: 0,
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_nota: 0,
    valor_moedas: 0,
    baratao: 0,
    diferenca_calculada: diferenca,
    observacoes,
  } as unknown as FechamentoFrentista;
}

describe('enviosPorFrentista', () => {
  it('um dia, um envio: o conferido canônico e a diferença do envio', () => {
    const resumo = enviosPorFrentista([envio(7, 1, 100.1, 200.2, 5)]);
    expect(resumo.get(7)).toEqual({ totalConferido: 300.3, diferenca: 5, conferido: false });
  });

  it('dois envios do MESMO dia (envio em dobro): vale o último, não soma — como antes', () => {
    const resumo = enviosPorFrentista([envio(7, 1, 100, 0, 5), envio(7, 1, 150, 0, -2)]);
    expect(resumo.get(7)).toEqual({ totalConferido: 150, diferenca: -2, conferido: false });
  });

  it('dias diferentes somam, em centavos, e a diferença soma com sinal', () => {
    const resumo = enviosPorFrentista([envio(7, 1, 0.1, 0.2, 10), envio(7, 2, 0.1, 0, -4)]);
    expect(resumo.get(7)).toEqual({ totalConferido: 0.4, diferenca: 6, conferido: false });
  });

  it('"conferido" só quando todos os envios do período têm a marca do painel', () => {
    const tudo = enviosPorFrentista([envio(7, 1, 1, 0, 0, '[CONFERIDO]'), envio(7, 2, 1, 0, 0, 'x [CONFERIDO]')]);
    const metade = enviosPorFrentista([envio(7, 1, 1, 0, 0, '[CONFERIDO]'), envio(7, 2, 1, 0, 0, 'Fechamento via PWA Frentista')]);
    expect(tudo.get(7)?.conferido).toBe(true);
    expect(metade.get(7)?.conferido).toBe(false);
  });

  it('frentistas diferentes não se misturam; quem não enviou não aparece', () => {
    const resumo = enviosPorFrentista([envio(7, 1, 10, 0, 0), envio(8, 1, 20, 0, 0)]);
    expect(resumo.get(7)?.totalConferido).toBe(10);
    expect(resumo.get(8)?.totalConferido).toBe(20);
    expect(resumo.has(9)).toBe(false);
  });
});
