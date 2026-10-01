import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buscarNaApi, chamarApi } from './cliente';
import { aoPerderSessao, esquecerToken, guardarToken, lerToken } from './sessao';

describe('cliente da API — sessão perdida', () => {
    let status = 200;
    const avisos: string[] = [];
    let pararDeOuvir: () => void = () => undefined;

    beforeEach(() => {
        avisos.length = 0;
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', async () => new Response('{"message":"Unauthenticated."}', { status }));
        pararDeOuvir = aoPerderSessao((mensagem) => avisos.push(mensagem));
    });

    afterEach(() => {
        pararDeOuvir();
        esquecerToken();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('401 numa chamada com token esquece o token e avisa o App', async () => {
        status = 401;
        guardarToken('tok-vencido');

        const lido = await buscarNaApi('/api/postos/1/bicos', z.unknown());

        expect(lido.isErr()).toBe(true);
        expect(lerToken()).toBeNull();
        expect(avisos).toEqual(['Sua sessão acabou. Entre de novo.']);
    });

    /** 401 sem token é o login recusado (senha errada), não uma sessão que acabou. */
    it('401 sem token não derruba sessão nenhuma', async () => {
        status = 401;

        const lido = await chamarApi('/api/login', { metodo: 'POST', corpo: {}, token: null }, z.unknown());

        expect(lido.isErr()).toBe(true);
        expect(avisos).toEqual([]);
    });

    it('sem VITE_API_URL não sai requisição', async () => {
        vi.stubEnv('VITE_API_URL', '');

        const erro = await buscarNaApi('/api/postos', z.unknown()).match(
            () => null,
            (e) => e,
        );

        expect(erro).toEqual({ tipo: 'sem_api' });
    });
});
