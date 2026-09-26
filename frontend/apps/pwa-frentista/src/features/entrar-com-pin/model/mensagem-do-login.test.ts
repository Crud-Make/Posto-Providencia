import { describe, expect, it } from 'vitest';
import { FORMATO_DO_PIN, mensagemDoLogin } from './mensagem-do-login';

describe('mensagemDoLogin', () => {
  it.each([
    [{ tipo: 'api', status: 401, codigo: null, mensagem: 'Frentista ou PIN incorretos.' } as const, 'PIN incorreto.'],
    [{ tipo: 'api', status: 429, codigo: null, mensagem: 'Too Many Attempts.' } as const, 'Muitas tentativas. Espere um minuto e tente de novo.'],
    [{ tipo: 'api', status: 422, codigo: null, mensagem: 'x' } as const, 'O PIN tem de 4 a 6 números.'],
    [{ tipo: 'api', status: 500, codigo: null, mensagem: 'Erro do servidor.' } as const, 'Erro do servidor.'],
    [{ tipo: 'rede', mensagem: 'Failed to fetch', causa: null } as const, 'Sem conexão com o servidor. Tente de novo.'],
    [{ tipo: 'dado_invalido', mensagem: 'x' } as const, 'O servidor respondeu fora do esperado. Tente de novo.'],
  ])('%o → %s', (erro, esperado) => {
    expect(mensagemDoLogin(erro)).toBe(esperado);
  });

  it('o PIN é de 4 a 6 dígitos', () => {
    expect(['1234', '123456', '0000'].every((pin) => FORMATO_DO_PIN.test(pin))).toBe(true);
    expect(['123', '1234567', '12a4', ''].some((pin) => FORMATO_DO_PIN.test(pin))).toBe(false);
  });
});
