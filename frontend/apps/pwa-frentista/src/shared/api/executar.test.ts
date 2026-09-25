import { describe, it, expect } from 'vitest';
import { executar } from './executar';
import { assertUnreachable, paraExcecao, type ErroDeApi } from './erros';

/**
 * A borda do P7c (22/09/2026): a falha do Supabase vira valor, e a fachada legada consegue
 * relançar igual. O erro é lido com `.match(() => null, (e) => e)` porque o
 * `neverthrow/must-use-result` não aceita `_unsafeUnwrapErr` como consumo.
 */
describe('shared/api — executar', () => {
    it('Ok com o data quando error é nulo', async () => {
        const dado = await executar(async () => ({ data: [{ id: 1 }], error: null })).match((d) => d, () => 'erro');
        expect(dado).toEqual([{ id: 1 }]);
    });

    it('Ok com null quando a consulta não devolve linha', async () => {
        const dado = await executar(async () => ({ data: null, error: null })).match((d) => d, () => 'erro');
        expect(dado).toBeNull();
    });

    it('Err banco com a mensagem crua quando o PostgREST devolve { error }', async () => {
        const erro = await executar(async () => ({ data: null, error: { message: 'new row violates row-level security' } }))
            .match(() => null, (e) => e);
        expect(erro).toEqual({ tipo: 'banco', mensagem: 'new row violates row-level security' });
    });

    it('Err rede com a causa intacta quando a promise rejeita', async () => {
        const causa = new Error('Failed to fetch');
        const erro = await executar(() => Promise.reject(causa)).match(() => null, (e) => e);
        expect(erro).toEqual({ tipo: 'rede', mensagem: 'Failed to fetch', causa });
    });

    it('Err rede quando a chamada lança de forma síncrona', async () => {
        const erro = await executar((): PromiseLike<{ data: null; error: null }> => { throw new Error('client quebrado'); })
            .match(() => null, (e) => e);
        expect(erro?.tipo).toBe('rede');
        expect(erro?.mensagem).toBe('client quebrado');
    });

    it('Err rede com rejeição que não é Error', async () => {
        const erro = await executar(() => Promise.reject('texto')).match(() => null, (e) => e);
        expect(erro).toEqual({ tipo: 'rede', mensagem: 'texto', causa: 'texto' });
    });
});

describe('shared/api — paraExcecao', () => {
    it('banco vira Error com a mesma mensagem', () => {
        const e = paraExcecao({ tipo: 'banco', mensagem: 'duplicado' });
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe('duplicado');
    });

    it('dado_invalido vira Error com a mesma mensagem', () => {
        expect((paraExcecao({ tipo: 'dado_invalido', mensagem: 'formato' }) as Error).message).toBe('formato');
    });

    it('rede devolve a própria causa, sem embrulho', () => {
        const causa = new TypeError('Failed to fetch');
        expect(paraExcecao({ tipo: 'rede', mensagem: 'Failed to fetch', causa })).toBe(causa);
    });

    it('assertUnreachable lança se o tipo mentir', () => {
        expect(() => assertUnreachable({ tipo: 'novo' } as never)).toThrow('Caso não tratado');
        expect(() => paraExcecao({ tipo: 'novo' } as unknown as ErroDeApi)).toThrow('Caso não tratado');
    });
});
