import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { errAsync, okAsync } from 'neverthrow';

/**
 * `trocarFoto` do `App.tsx` consumindo o `ResultAsync` da entity `frentista` (RES-2).
 *
 * @remarks Arquivo separado do `App.test.tsx` de propósito: aqui a entity é mockada
 *          (`reduzirParaAvatar` precisa de canvas, que o jsdom não tem), e o mock não
 *          pode vazar para os testes de payload do envio.
 *
 *          O que se prende:
 *          - Err da redução → o MESMO dialog de antes ("Não deu para salvar a foto" + a
 *            frase de `mensagemDeFoto`), e `api.salvarFotoFrentista` NÃO é chamada;
 *          - Ok da redução → salva o avatar reduzido e ele vai para a tela;
 *          - falha de `api.salvarFotoFrentista` (legada, lança) → o `catch` segue mostrando
 *            a mensagem do erro.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
    reduzirParaAvatar: vi.fn(),
    salvarFotoFrentista: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('./services/api', () => ({
    api: {
        getFrentistas: async () => [{ id: 1, nome: 'Fulano' }],
        getEnviosDoDia: async () => [],
        getOrCreateFechamento: async () => 1,
        submitFrentistaClosing: async () => ({}),
        marcarPresenca: async () => undefined,
        salvarFotoFrentista: mocks.salvarFotoFrentista,
    },
}));

vi.mock('@frentista/entities/frentista', async (importOriginal) => {
    const original = await importOriginal<typeof import('@frentista/entities/frentista')>();
    return { ...original, reduzirParaAvatar: mocks.reduzirParaAvatar };
});

const App = (await import('./App')).default;

let container: HTMLDivElement;
let root: Root;

const montar = async () => {
    await act(async () => {
        root.render(React.createElement(App));
    });
};

/** Simula a escolha de um arquivo no `<input type="file">` escondido. */
const escolherFoto = async () => {
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const arquivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [arquivo], configurable: true });
    await act(async () => {
        input?.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

describe('PWA do frentista — trocar a foto', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('pwa.frentista', JSON.stringify({ id: 1, nome: 'Fulano' }));
        mocks.reduzirParaAvatar.mockReset();
        mocks.salvarFotoFrentista.mockReset().mockResolvedValue(undefined);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        localStorage.clear();
    });

    it('erro da redução abre o dialog com a frase da entity e não salva nada', async () => {
        mocks.reduzirParaAvatar.mockImplementation(() => errAsync({ tipo: 'foto_grande_demais' }));

        await montar();
        await escolherFoto();

        expect(mocks.reduzirParaAvatar).toHaveBeenCalledTimes(1);
        expect(mocks.salvarFotoFrentista).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Não deu para salvar a foto');
        expect(container.textContent).toContain('A foto ficou grande demais. Tente uma imagem mais simples.');
        // `salvandoFoto` volta a false: o botão do avatar fica tocável de novo.
        const botao = container.querySelector<HTMLButtonElement>('button[aria-label="Trocar a foto de Fulano"]');
        expect(botao?.disabled).toBe(false);
    });

    it('sucesso da redução salva o avatar reduzido e não abre dialog de erro', async () => {
        mocks.reduzirParaAvatar.mockImplementation(() => okAsync('data:image/jpeg;base64,AVATAR'));

        await montar();
        await escolherFoto();

        expect(mocks.salvarFotoFrentista).toHaveBeenCalledWith(1, 'data:image/jpeg;base64,AVATAR');
        expect(container.textContent).not.toContain('Não deu para salvar a foto');
        expect(container.querySelector('img[src="data:image/jpeg;base64,AVATAR"]')).not.toBeNull();
    });

    it('falha ao salvar (api legada, lança) segue caindo no catch com a mensagem do erro', async () => {
        mocks.reduzirParaAvatar.mockImplementation(() => okAsync('data:image/jpeg;base64,AVATAR'));
        mocks.salvarFotoFrentista.mockRejectedValue(new Error('sem rede'));

        await montar();
        await escolherFoto();

        expect(container.textContent).toContain('Não deu para salvar a foto');
        expect(container.textContent).toContain('sem rede');
        const botao = container.querySelector<HTMLButtonElement>('button[aria-label="Trocar a foto de Fulano"]');
        expect(botao?.disabled).toBe(false);
    });
});
