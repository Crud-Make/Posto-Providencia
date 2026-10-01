import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { z } from 'zod';
import { buscarNaApi } from './api/cliente';
import { esquecerToken, lerToken } from './api/sessao';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// As telas de dados têm teste próprio. Aqui elas só provam o posto que receberam e fazem UMA
// chamada à API pelo cliente de verdade — é o caminho do 401 que interessa.
vi.mock('./screens/EncerranteScreen', () => ({
    default: ({ postoId }: { postoId: number }) =>
        React.createElement(
            'button',
            {
                type: 'button',
                'data-testid': 'tela-encerrante',
                onClick: () => void buscarNaApi(`/api/postos/${postoId}/bicos`, z.unknown()).match(() => undefined, () => undefined),
            },
            `encerrante do posto ${postoId}`,
        ),
}));
vi.mock('./screens/EnviosScreen', () => ({ default: () => React.createElement('p', null, 'envios') }));

const App = (await import('./App')).default;

let container: HTMLDivElement;
let root: Root;
let statusDosBicos = 200;
const caminhos: string[] = [];

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

const escoar = async () => {
    for (let volta = 0; volta < 5; volta++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
};

const digitar = (input: HTMLInputElement, texto: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, texto);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

const clicar = async (el: Element | null) => {
    await act(async () => {
        (el as HTMLElement).click();
    });
    await escoar();
};

const entrarNoBr = async () => {
    await act(async () => {
        root.render(React.createElement(App));
    });
    await escoar();
    await clicar(container.querySelector('button[aria-label="Entrar no Posto BR"]'));
    const [usuario, senha] = [...container.querySelectorAll('form input')] as HTMLInputElement[];
    if (usuario === undefined || senha === undefined) throw new Error('o cartão do BR não abriu o formulário');
    digitar(usuario, 'elias');
    digitar(senha, 's3nha');
    await clicar(container.querySelector('button[type="submit"]'));
};

describe('App — sessão do dono', () => {
    beforeEach(() => {
        statusDosBicos = 200;
        caminhos.length = 0;
        localStorage.clear();
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', async (url: string) => {
            const caminho = new URL(url).pathname;
            caminhos.push(caminho);
            if (caminho === '/api/postos') return json({ data: [{ id: 1, nome: 'Posto Jorro', foto: null }, { id: 2, nome: 'Posto BR', foto: null }] });
            if (caminho === '/api/login') {
                return json({ token: 'tok-br', usuario: { id: 5, nome: 'Elias', email: 'e@b.r', role: 'GERENTE', postos: [{ id: 2, nome: 'Posto BR', papel: 'GERENTE' }] } });
            }
            if (caminho === '/api/postos/2/bicos') return json({ message: 'x' }, statusDosBicos);
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

    it('começa pela entrada e, entrando no BR, a tela recebe o posto 2', async () => {
        await entrarNoBr();

        expect(container.querySelector('[data-testid="tela-encerrante"]')?.textContent).toBe('encerrante do posto 2');
        expect(container.textContent).toContain('Posto BR');
        expect(container.textContent).toContain('Elias');
    });

    /** Token morto (revogado, vencido) em qualquer chamada: volta para a entrada dizendo por quê. */
    it('401 numa chamada volta para a entrada com a mensagem de sessão acabada', async () => {
        await entrarNoBr();
        statusDosBicos = 401;

        await clicar(container.querySelector('[data-testid="tela-encerrante"]'));

        expect(container.querySelector('[data-testid="tela-encerrante"]')).toBeNull();
        expect(container.querySelector('[role="alert"]')?.textContent).toBe('Sua sessão acabou. Entre de novo.');
        expect(container.textContent).toContain('Escolha o posto');
        expect(lerToken()).toBeNull();
    });

    it('"Trocar posto / Sair" encerra a sessão na API e volta para os cartões', async () => {
        await entrarNoBr();

        const sair = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Trocar posto'));
        await clicar(sair ?? null);

        expect(caminhos).toContain('/api/sair');
        expect(lerToken()).toBeNull();
        expect(container.querySelector('button[aria-label="Entrar no Posto Jorro"]')).not.toBeNull();
        expect(container.querySelector('[role="alert"]')).toBeNull();
    });
});
