import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./services/api', () => ({
    api: {
        getFrentistas: async () => [{ id: 1, nome: 'Fulano' }],
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

describe('PWA do frentista — abas', () => {
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

    it('mantém as abas de frentista exigindo frentista', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).toContain('Selecione um frentista primeiro');
    });

    /**
     * A aba Encerrante saiu para o `apps/pwa-dono`. Os celulares que já tinham
     * o app guardam `pwa.activeTab = 'encerrante'` no localStorage — um valor
     * que não corresponde mais a tela nenhuma aqui.
     *
     * Sem a conferência de `ABAS_VALIDAS`, o app abriria no Registro com a
     * barra inferior sem nada selecionado: parece app quebrado para quem só
     * atualizou.
     */
    it('cai no Registro quando o localStorage guarda a aba que saiu do app', async () => {
        localStorage.setItem('pwa.activeTab', 'encerrante');

        await montar();

        expect(container.textContent).toContain('Registro de Turno');
        expect(container.textContent).not.toContain('Fotografar papel do encerrante');
    });

    it('não oferece mais a aba Encerrante na barra inferior', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).not.toContain('Encerrante');
    });
});
