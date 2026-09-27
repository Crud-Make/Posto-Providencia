import { describe, expect, it } from 'vitest';
import { jaTemChave, mensagemDaChave } from './mensagem-da-chave';

describe('mensagemDaChave (primeiro acesso, 27/09/2026)', () => {
  const jaTem = { tipo: 'api', status: 409, codigo: 'ja_tem_chave', mensagem: 'Este frentista já tem chave. Peça ao gerente para zerar.' } as const;

  it.each([
    [jaTem, 'Este frentista já tem chave. Peça ao gerente para zerar.'],
    [{ tipo: 'api', status: 404, codigo: null, mensagem: 'Frentista não encontrado.' } as const, 'Frentista não encontrado neste posto. Fale com o gerente.'],
    [{ tipo: 'api', status: 422, codigo: null, mensagem: 'x' } as const, 'A chave tem de 4 a 6 números, igual nos dois campos.'],
    [{ tipo: 'api', status: 429, codigo: null, mensagem: 'x' } as const, 'Muitas tentativas. Espere um minuto e tente de novo.'],
    [{ tipo: 'rede', mensagem: 'Failed to fetch', causa: null } as const, 'Sem conexão com o servidor. Tente de novo.'],
  ])('%o → %s', (erro, esperado) => {
    expect(mensagemDaChave(erro)).toBe(esperado);
  });

  it('só o 409 ja_tem_chave manda para o PIN', () => {
    expect(jaTemChave(jaTem)).toBe(true);
    expect(jaTemChave({ tipo: 'api', status: 409, codigo: 'outro', mensagem: 'x' })).toBe(false);
    expect(jaTemChave({ tipo: 'api', status: 404, codigo: null, mensagem: 'x' })).toBe(false);
  });
});
