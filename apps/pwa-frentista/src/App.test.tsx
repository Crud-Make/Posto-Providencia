import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./services/api', () => ({
    api: {
        getFrentistas: async () => [{ id: 1, nome: 'Fulano' }],
        getBicos: async () => [],
        getUltimasLeiturasPorBico: async () => new Map<number, number>(),
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

    it('mantém as outras abas exigindo frentista', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).toContain('Selecione um frentista primeiro');
    });
});
