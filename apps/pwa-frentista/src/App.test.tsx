import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./services/api', () => ({
    api: {
        getFrentistas: async () => [{ id: 1, nome: 'Fulano' }],
        getBicos: async () => [
            { id: 10, numero: 1, combustivel_id: 1, combustivel: { nome: 'Gasolina Comum', preco_venda: 6.98 } },
        ],
        getUltimasLeiturasPorBico: async () => new Map<number, number>([[10, 1862111.422]]),
        aquecerEncerrante: () => { },
        salvarLeituras: async () => [],
    },
}));

const App = (await import('./App')).default;

let container: HTMLDivElement;
let root: Root;

const montar = async () => {
    await act(async () => {
        root.render(React.createElement(App));
    });
};

/**
 * Digita num input controlado pelo React.
 *
 * @remarks Atribuir `input.value` direto não avisa o React: ele guarda o valor
 *          anterior no nó e trata a mudança como ruído, então `onChange` nunca
 *          dispara. O setter do protótipo contorna esse cache.
 */
const digitar = (input: HTMLInputElement, texto: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, texto);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

describe('PWA — aba Encerrante', () => {
    beforeEach(() => {
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        localStorage.clear();
    });

    /**
     * Regra de produto (pedido do dono, 02/08): o encerrante é a leitura da bomba,
     * não pertence a ninguém — `Leitura` nem grava frentista. Exigir a seleção era
     * cerimônia que travava o envio à toa.
     */
    it('abre direto, sem exigir frentista selecionado', async () => {
        localStorage.setItem('pwa.activeTab', 'encerrante');
        // sem 'pwa.frentista' — ninguém selecionado

        await montar();

        expect(container.textContent).not.toContain('Selecione um frentista primeiro');
        expect(container.textContent).toContain('Enviar Encerrante');
        expect(container.textContent).toContain('Fotografar papel do encerrante');
    });

    /**
     * O OCR é o caminho feliz, não o único: se a foto sair tremida ou a rede
     * cair no posto, digitar na mão precisa continuar sendo saída. Antes o
     * botão só destravava depois de uma leitura bem-sucedida da foto, e o
     * frentista digitava os números para descobrir que não conseguia enviar.
     */
    it('libera o envio com valor digitado à mão, sem foto', async () => {
        localStorage.setItem('pwa.activeTab', 'encerrante');
        await montar();

        const botao = [...container.querySelectorAll('button')]
            .find(b => b.textContent?.includes('Enviar Leituras')) as HTMLButtonElement;
        expect(botao.disabled).toBe(true); // nada preenchido ainda

        const campo = container.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
        digitar(campo, '1.862.500,000');

        expect(botao.disabled).toBe(false);
    });

    it('mantém o envio travado enquanto nenhum bico tem valor', async () => {
        localStorage.setItem('pwa.activeTab', 'encerrante');
        await montar();

        const campo = container.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
        digitar(campo, '0,000');

        const botao = [...container.querySelectorAll('button')]
            .find(b => b.textContent?.includes('Enviar Leituras')) as HTMLButtonElement;
        expect(botao.disabled).toBe(true);
    });

    it('mantém as outras abas exigindo frentista', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).toContain('Selecione um frentista primeiro');
    });
});
