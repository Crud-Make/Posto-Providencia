import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import EntradaScreen from './EntradaScreen';
import { esquecerToken, lerToken } from '../api/sessao';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Chamada {
    readonly metodo: string;
    readonly caminho: string;
    readonly corpo: unknown;
    readonly autorizacao: string | undefined;
}

const POSTOS = [
    { id: 1, nome: 'Posto Jorro', foto: null },
    { id: 2, nome: 'Posto BR', foto: '/api/postos/2/foto?v=3' },
];

const perfil = (postos: number[]) => ({
    id: 5,
    nome: 'Elias',
    email: 'elias@posto.br',
    role: 'GERENTE',
    postos: postos.map((id) => ({ id, nome: `Posto ${id}`, papel: 'GERENTE' })),
});

let chamadas: Chamada[] = [];
let respostaDoLogin: () => Response;

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

let container: HTMLDivElement;
let root: Root;
const aoEntrar = vi.fn();

const escoar = async () => {
    for (let volta = 0; volta < 5; volta++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
};

const montar = async (aviso: string | null = null) => {
    await act(async () => {
        root.render(React.createElement(EntradaScreen, { aviso, aoEntrar }));
    });
    await escoar();
};

const digitar = (input: HTMLInputElement, texto: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, texto);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

const porRotulo = (texto: string) => {
    const label = [...container.querySelectorAll('label')].find((l) => l.textContent === texto);
    // Por id, e não por seletor: o `useId` do React gera ids com caracteres que o CSS não aceita.
    return label === undefined ? null : (document.getElementById(label.htmlFor) as HTMLInputElement | null);
};

const escolherPosto = async (nome: string) => {
    const cartao = container.querySelector(`button[aria-label="Entrar no ${nome}"]`) as HTMLButtonElement;
    await act(async () => {
        cartao.click();
    });
};

const entrar = async (usuario: string | null, senha: string) => {
    if (usuario !== null) digitar(porRotulo('Usuário') as HTMLInputElement, usuario);
    digitar(porRotulo('Senha') as HTMLInputElement, senha);
    const botao = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    await act(async () => {
        botao.click();
    });
    await escoar();
};

const alerta = () => container.querySelector('[role="alert"]')?.textContent ?? '';

describe('EntradaScreen — cartão do posto + conta daquele posto', () => {
    beforeEach(() => {
        chamadas = [];
        aoEntrar.mockReset();
        localStorage.clear();
        esquecerToken();
        respostaDoLogin = () => json({ token: 'tok-br', usuario: perfil([2]) });
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
            const caminho = new URL(url).pathname;
            const metodo = init.method ?? 'GET';
            const cabecalhos = (init.headers ?? {}) as Record<string, string>;
            chamadas.push({
                metodo,
                caminho,
                corpo: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
                autorizacao: cabecalhos.Authorization,
            });
            if (caminho === '/api/postos') return json({ data: POSTOS });
            if (caminho === '/api/login') return respostaDoLogin();
            if (caminho === '/api/sair') return new Response(null, { status: 204 });
            return json({}, 404);
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        esquecerToken();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('mostra um cartão por posto da rede, com a foto pela API', async () => {
        await montar();

        expect(container.textContent).toContain('Posto Jorro');
        expect(container.textContent).toContain('Posto BR');
        expect(container.querySelector('img')?.getAttribute('src')).toBe('http://api.teste/api/postos/2/foto?v=3');
    });

    it('entra com o usuário no posto escolhido e guarda o token só na memória', async () => {
        await montar();
        await escolherPosto('Posto BR');
        await entrar('elias', 's3nha');

        const login = chamadas.find((c) => c.caminho === '/api/login');
        expect(login?.metodo).toBe('POST');
        expect(login?.corpo).toEqual({ posto_id: 2, usuario: 'elias', senha: 's3nha', dispositivo: 'pwa-dono' });
        expect(login?.autorizacao).toBeUndefined();
        expect(aoEntrar).toHaveBeenCalledTimes(1);
        expect(aoEntrar.mock.calls[0]?.[0]).toMatchObject({ id: 2, nome: 'Posto BR' });
        expect(lerToken()).toBe('tok-br');
        // No navegador fica só o usuário daquele posto — nunca a senha nem o token.
        expect(localStorage.getItem('pwa-dono.login-do-posto.2')).toBe('elias');
        expect(JSON.stringify({ ...localStorage })).not.toContain('tok-br');
        expect(JSON.stringify({ ...localStorage })).not.toContain('s3nha');
    });

    /** Contas separadas por posto (27/09): a conta do Jorro não abre o BR. */
    it('recusa a conta que não é do posto escolhido e encerra o token dela', async () => {
        respostaDoLogin = () => json({ token: 'tok-do-jorro', usuario: perfil([1]) });
        await montar();
        await escolherPosto('Posto BR');
        await entrar('elias', 's3nha');

        expect(alerta()).toBe('Esta conta não é do Posto BR.');
        expect(aoEntrar).not.toHaveBeenCalled();
        expect(lerToken()).toBeNull();
        const saida = chamadas.find((c) => c.caminho === '/api/sair');
        expect(saida?.autorizacao).toBe('Bearer tok-do-jorro');
        expect(localStorage.getItem('pwa-dono.login-do-posto.2')).toBeNull();
    });

    it('senha errada (401) diz isso, sem derrubar nada', async () => {
        respostaDoLogin = () => json({ message: 'Usuário ou senha incorretos.' }, 401);
        await montar();
        await escolherPosto('Posto BR');
        await entrar('elias', 'errada');

        expect(alerta()).toBe('Usuário ou senha incorretos.');
        expect(aoEntrar).not.toHaveBeenCalled();
    });

    it('muitas tentativas (429) pede para esperar', async () => {
        respostaDoLogin = () => json({ message: 'Too Many Attempts.' }, 429);
        await montar();
        await escolherPosto('Posto BR');
        await entrar('elias', 's3nha');

        expect(alerta()).toBe('Muitas tentativas. Espere um minuto e tente de novo.');
    });

    it('texto com "@" entra como e-mail (a conta do ADMIN)', async () => {
        await montar();
        await escolherPosto('Posto BR');
        await entrar('admin@rede.br', 's3nha');

        const login = chamadas.find((c) => c.caminho === '/api/login');
        expect(login?.corpo).toEqual({ email: 'admin@rede.br', senha: 's3nha', dispositivo: 'pwa-dono' });
    });

    it('na volta, o cartão pede só a senha do usuário lembrado daquele posto', async () => {
        localStorage.setItem('pwa-dono.login-do-posto.2', 'elias');
        await montar();
        await escolherPosto('Posto BR');

        expect(porRotulo('Usuário')).toBeNull();
        expect(container.textContent).toContain('Entrando como elias');

        await entrar(null, 's3nha');

        expect(chamadas.find((c) => c.caminho === '/api/login')?.corpo).toMatchObject({ posto_id: 2, usuario: 'elias' });
    });

    it('não chama a API com a senha em branco', async () => {
        await montar();
        await escolherPosto('Posto BR');
        await entrar('elias', '');

        expect(alerta()).toBe('Informe a senha.');
        expect(chamadas.some((c) => c.caminho === '/api/login')).toBe(false);
    });

    it('mostra o aviso que trouxe a pessoa de volta', async () => {
        await montar('Sua sessão acabou. Entre de novo.');

        expect(alerta()).toBe('Sua sessão acabou. Entre de novo.');
    });
});
