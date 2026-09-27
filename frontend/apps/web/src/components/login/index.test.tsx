import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { okAsync } from 'neverthrow';

/**
 * A tela de entrada é a ÚNICA do painel (27/09/2026): cartões dos postos e, na mesma tela, o e-mail e
 * a senha do posto escolhido. O que se prende: sem escolher o posto não há formulário, e a conta que
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
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));

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
});
afterEach(() => {
    act(() => raiz.unmount());
    div.remove();
});

describe('TelaDeEntrada', () => {
    it('abre nos cartões dos postos, SEM formulário até escolher um', async () => {
        await montar();
        expect(div.textContent).toContain('Escolha o posto para começar');
        expect(div.textContent).toContain('Posto Jorro');
        expect(div.textContent).toContain('Posto BR');
        expect(div.querySelector('input[name="senha"]')).toBeNull();
    });

    it('escolheu o BR: o e-mail e a senha do BR aparecem na mesma tela', async () => {
        await montar();
        await act(async () => botao('Posto BR').click());
        expect(div.textContent).toContain('Entrar no Posto BR');
        expect(div.querySelector('input[name="email"]')).not.toBeNull();
        expect(div.querySelector('input[name="senha"]')).not.toBeNull();
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
});
