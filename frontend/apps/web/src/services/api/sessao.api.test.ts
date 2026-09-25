import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buscarNaApi, loginPelaApiLigado } from './base';
import { entrarNaApi, mensagemDoLogin, perfilDaSessao, sairDaApi } from './sessao.api';
import { guardarTokenDaApi, lerTokenDaApi } from './token-da-api';

/**
 * Login próprio da API (#102): o painel entra, guarda o token, manda o token em toda chamada e o
 * esquece quando a API o recusa ou quando sai. E, com a flag desligada, o token guardado NÃO vaza
 * para as chamadas — o painel da transição segue no Supabase.
 */

const PERFIL = {
    id: 7,
    nome: 'Elias',
    email: 'postoprovidenciaa@gmail.com',
    role: 'GERENTE',
    postos: [
        { id: 1, nome: 'Posto Jorro', papel: 'gerente' },
        { id: 2, nome: 'Posto BR', papel: 'gerente' },
    ],
};

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => (status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(corpo), { status }))),
    );
}

function cabecalhosEnviados(): Record<string, string> {
    const init: unknown = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = typeof init === 'object' && init !== null ? (init as RequestInit).headers : undefined;
    return typeof headers === 'object' && headers !== null ? (headers as Record<string, string>) : {};
}

function ligaLoginPelaApi(): void {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_API_LOGIN', '1');
}

beforeEach(() => localStorage.clear());
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('loginPelaApiLigado', () => {
    it('só liga com VITE_API_URL E VITE_API_LOGIN=1/true — não segue o global como as flags de tela', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        expect(loginPelaApiLigado()).toBe(false);
        vi.stubEnv('VITE_API_LOGIN', '0');
        expect(loginPelaApiLigado()).toBe(false);
        vi.stubEnv('VITE_API_LOGIN', ' True ');
        expect(loginPelaApiLigado()).toBe(true);
        vi.stubEnv('VITE_API_URL', '');
        expect(loginPelaApiLigado()).toBe(false);
    });
});

describe('entrarNaApi', () => {
    it('faz POST /api/login, guarda o token e devolve o perfil com os postos', async () => {
        ligaLoginPelaApi();
        respondeCom({ token: '3|posto_abc', usuario: PERFIL });

        const nomes = await entrarNaApi('postoprovidenciaa@gmail.com', 'segredo123').match(
            (perfil) => perfil.postos.map((p) => p.nome),
            () => [],
        );

        expect(nomes).toEqual(['Posto Jorro', 'Posto BR']);
        expect(lerTokenDaApi()).toBe('3|posto_abc');
        const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
        expect(url).toBe('http://localhost:8000/api/login');
        expect((init as RequestInit).method).toBe('POST');
        expect(JSON.parse(String((init as RequestInit).body))).toEqual({ email: 'postoprovidenciaa@gmail.com', senha: 'segredo123', dispositivo: 'painel' });
    });

    it('senha errada (401) não guarda token e vira a frase da tela', async () => {
        ligaLoginPelaApi();
        respondeCom({ message: 'E-mail ou senha incorretos.' }, 401);

        const frase = await entrarNaApi('x@teste.com', 'errada').match(() => 'entrou', mensagemDoLogin);

        expect(lerTokenDaApi()).toBeNull();
        expect(frase).toBe('E-mail ou senha incorretos.');
    });
});

describe('token nas chamadas', () => {
    it('com a flag ligada, toda chamada leva o token guardado como Bearer', async () => {
        ligaLoginPelaApi();
        guardarTokenDaApi('3|posto_abc');
        respondeCom({ data: 1 });

        await buscarNaApi('/api/postos/1/leituras', z.object({ data: z.number() })).match(() => undefined, () => undefined);

        expect(cabecalhosEnviados().Authorization).toBe('Bearer 3|posto_abc');
    });

    it('com a flag DESLIGADA, o token guardado não é enviado — o painel da transição segue no Supabase', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        guardarTokenDaApi('3|posto_abc');
        respondeCom({ data: 1 });

        await buscarNaApi('/api/postos/1/leituras', z.object({ data: z.number() })).match(() => undefined, () => undefined);

        expect(cabecalhosEnviados().Authorization).not.toBe('Bearer 3|posto_abc');
    });
});

describe('perfilDaSessao e sairDaApi', () => {
    it('token recusado (401) em /api/eu é esquecido na hora', async () => {
        ligaLoginPelaApi();
        guardarTokenDaApi('3|vencido');
        respondeCom({ message: 'Token inválido.' }, 401);

        expect(await perfilDaSessao().match(() => 'ok', () => 'erro')).toBe('erro');
        expect(lerTokenDaApi()).toBeNull();
    });

    it('falha de rede em /api/eu NÃO esquece o token — a internet caiu, a sessão não', async () => {
        ligaLoginPelaApi();
        guardarTokenDaApi('3|posto_abc');
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));

        expect(await perfilDaSessao().match(() => 'ok', () => 'erro')).toBe('erro');
        expect(lerTokenDaApi()).toBe('3|posto_abc');
    });

    it('sair (204) esquece o token; e esquece mesmo se a API não responder', async () => {
        ligaLoginPelaApi();
        guardarTokenDaApi('3|posto_abc');
        respondeCom(null, 204);
        expect(await sairDaApi().match(() => 'ok', () => 'erro')).toBe('ok');
        expect(lerTokenDaApi()).toBeNull();

        guardarTokenDaApi('4|posto_def');
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
        expect(await sairDaApi().match(() => 'ok', () => 'erro')).toBe('erro');
        expect(lerTokenDaApi()).toBeNull();
    });
});

describe('mensagemDoLogin', () => {
    it('traduz cada falha numa frase da tela', () => {
        expect(mensagemDoLogin({ tipo: 'http', status: 429 })).toBe('Muitas tentativas. Espere um minuto e tente de novo.');
        expect(mensagemDoLogin({ tipo: 'rede', detalhe: 'x' })).toBe('Não foi possível falar com o servidor. Confira a internet.');
        expect(mensagemDoLogin({ tipo: 'http', status: 500 })).toBe('Não foi possível entrar agora. Tente de novo.');
    });
});
