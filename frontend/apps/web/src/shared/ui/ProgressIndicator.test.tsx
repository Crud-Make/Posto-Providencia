import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProgressIndicator } from './ProgressIndicator';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

type Props = React.ComponentProps<typeof ProgressIndicator>;

/** Renderiza e devolve o texto do rótulo (o único `<span>` do componente). */
function rotulo(props: Props): string {
    act(() => {
        root.render(<ProgressIndicator {...props} />);
    });
    return container.querySelector('span')?.textContent ?? '';
}

describe('ProgressIndicator — rótulo', () => {
    it('mostra o label quando ele vem definido e não vazio', () => {
        expect(rotulo({ current: 2, total: 5, label: 'Etapa 2 de 5' })).toBe('Etapa 2 de 5');
    });

    it('mostra current/total quando o label não vem', () => {
        expect(rotulo({ current: 2, total: 5 })).toBe('2/5');
    });

    it('mostra current/total quando o label vem como string vazia', () => {
        expect(rotulo({ current: 3, total: 3, label: '' })).toBe('3/3');
    });
});
