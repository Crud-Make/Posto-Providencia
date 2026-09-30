import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { okAsync } from 'neverthrow';

/**
 * A tela de entrada é a ÚNICA do painel (27/09/2026): cartões dos postos e, na mesma tela, o usuário e
 * a senha do posto escolhido (o usuário vale dentro daquele posto, 30/09/2026). O que se prende: sem escolher o posto não há formulário, e a conta que
 * não é do posto escolhido é recusada e sai.
 */

const estado = {
    usuario: null as null | { postos: { id: number }[] },
    postoAtivo: null as null | { id: number },
    sair: vi.fn(async () => Promise.resolve()),
    setPostoAtivo: vi.fn(),
};

vi.mock('../../services/api/base', () => ({ loginPelaApiLigado: () => true }));
vi.mock('../../services/api/sessao.api', () => ({
    postosDaRede: () => okAsync([{ id: 1, nome: 'Posto Jorro' }, { id: 2, nome: 'Posto BR' }]),
}));
vi.mock('../../contexts/useAuth', () => ({
    useAuth: () => ({ usuario: estado.usuario, sair: estado.sair, entrar: vi.fn(), pedirRecuperacaoSenha: vi.fn() }),
}));
vi.mock('../../contexts/usePosto', () => ({
    usePosto: () => ({ postoAtivo: estado.postoAtivo, setPostoAtivo: estado.setPostoAtivo }),
}));
const tema = { atual: 'light' as 'light' | 'dark' };
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: tema.atual, toggleTheme: vi.fn() }) }));

const { default: TelaDeEntrada } = await import('./index');

let raiz: Root;
let div: HTMLDivElement;

async function montar(): Promise<void> {
    div = document.createElement('div');
    document.body.appendChild(div);
    raiz = createRoot(div);
    await act(async () => raiz.render(<TelaDeEntrada />));
}

function botao(texto: string): HTMLButtonElement {
    const achado = [...div.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto));
    if (achado === undefined) throw new Error(`sem botão "${texto}"`);
    return achado;
}

beforeEach(() => {
    estado.usuario = null;
    estado.postoAtivo = null;
    estado.sair.mockClear();
    tema.atual = 'light';
});
afterEach(() => {
    act(() => raiz.unmount());
    div.remove();
});

describe('TelaDeEntrada', () => {
    it('abre nos cartões dos postos, SEM formulário até escolher um', async () => {
        await montar();
        expect(div.textContent).toContain('Escolha o posto');
        expect(div.textContent).toContain('Posto Jorro');
        expect(div.textContent).toContain('Posto BR');
        expect(div.querySelector('input[name="senha"]')).toBeNull();
    });

    it('escolheu o BR: o cartão do BR pede a senha (e o usuário, sem nenhum lembrado)', async () => {
        await montar();
        await act(async () => botao('Posto BR').click());
        expect(div.querySelector('input[aria-label="Senha do Posto BR"]')).not.toBeNull();
        const usuario = div.querySelector<HTMLInputElement>('input[aria-label="Usuário do Posto BR"]');
        expect(usuario).not.toBeNull();
        // Nome curto, não e-mail: teclado de texto, sem maiúscula automática nem corretor.
        expect(usuario?.type).toBe('text');
        expect(usuario?.placeholder).toBe('Usuário');
        expect(usuario?.getAttribute('autocomplete')).toBe('username');
        expect(usuario?.getAttribute('autocapitalize')).toBe('none');
        expect(usuario?.getAttribute('spellcheck')).toBe('false');
        expect(div.querySelector('input[aria-label="E-mail do Posto BR"]')).toBeNull();
        expect(div.querySelector('button[aria-label="Entrar no Posto BR"]')).not.toBeNull();
        expect(div.textContent).not.toContain('Salvar meu acesso');
    });

    it('entrou com conta que não é do posto escolhido: recusa e sai', async () => {
        await montar();
        await act(async () => botao('Posto BR').click());
        estado.usuario = { postos: [{ id: 1 }] };
        await act(async () => raiz.render(<TelaDeEntrada />));
        expect(estado.sair).toHaveBeenCalledOnce();
        expect(div.textContent).toContain('Esta conta não é do Posto BR.');
    });

    it('escolhido, o cartão troca o nome pela senha — dentro dele mesmo, sem painel à parte (28/09/2026)', async () => {
        await montar();
        await act(async () => botao('Posto BR').click());

        const senha = div.querySelector('input[aria-label="Senha do Posto BR"]');
        const cartao = senha?.closest('form')?.parentElement;
        expect(cartao?.querySelector('img[alt="Fachada do Posto BR"], button[aria-label="Trocar a foto do Posto BR"]')).not.toBeNull();
        expect(div.querySelector('section[aria-label="Entrar"]')).toBeNull();
        // O Jorro, não escolhido, segue com o nome e sem senha.
        expect(botao('Posto Jorro')).toBeDefined();
        expect(div.querySelector('input[aria-label="Senha do Posto Jorro"]')).toBeNull();

        await act(async () => botao('Posto Jorro').click());
        expect(div.querySelector('input[aria-label="Senha do Posto Jorro"]')).not.toBeNull();
        expect(div.querySelector('input[aria-label="Senha do Posto BR"]')).toBeNull();
    });

    it('modo escuro: a chegada vira noite, com estrelas, e o botão oferece o claro (28/09/2026)', async () => {
        await montar();
        expect(div.querySelector('button[aria-label="Usar modo escuro"]')).not.toBeNull();
        expect(div.querySelectorAll('svg circle[r="1.6"]')).toHaveLength(0);
        act(() => raiz.unmount());
        div.remove();

        tema.atual = 'dark';
        await montar();
        expect(div.querySelector('button[aria-label="Usar modo claro"]')).not.toBeNull();
        expect(div.querySelectorAll('svg circle[r="1.6"]').length).toBeGreaterThan(0);
    });
});
