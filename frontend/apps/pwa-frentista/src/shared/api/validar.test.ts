import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { conferirDepoisDeGravar, validar } from './validar';

describe('shared/api — validar', () => {
    const schema = z.object({ id: z.number() });

    it('Ok com o dado quando bate com o schema', () => {
        const dado = validar(schema, 'Teste')({ id: 1 }).match((d) => d, () => null);
        expect(dado).toEqual({ id: 1 });
    });

    it('Err dado_invalido dizendo onde e o quê, sem coagir', () => {
        const erro = validar(schema, 'Teste')({ id: '1' }).match(() => null, (e) => e);
        expect(erro?.tipo).toBe('dado_invalido');
        expect(erro?.mensagem).toContain('Resposta inesperada do banco em Teste');
        expect(erro?.mensagem).toContain('id:');
    });
});

describe('shared/api — conferirDepoisDeGravar', () => {
    const schema = z.object({ id: z.number() });

    it('devolve o dado quando bate com o schema, sem aviso', () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(conferirDepoisDeGravar(schema, 'Teste')({ id: 1 })).toEqual({ id: 1 });
        expect(aviso).not.toHaveBeenCalled();
        aviso.mockRestore();
    });

    it('fora do formato: null e aviso dizendo onde e o quê — nunca erro (a gravação vale)', () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(conferirDepoisDeGravar(schema, 'Teste')({ id: '1' })).toBeNull();
        expect(String(aviso.mock.calls[0]?.[0])).toContain('Teste');
        expect(String(aviso.mock.calls[0]?.[0])).toContain('id:');
        aviso.mockRestore();
    });
});
