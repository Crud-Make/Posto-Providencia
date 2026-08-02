import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { FixaPendente } from '@posto/utils';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { ModalFixasPendentes } from './ModalFixasPendentes';

/**
 * Valores reais de 2026: "Paulo" (salário) na casa dos milhares e "Luz" com
 * centavos quebrados. Os dois juntos cobrem as duas falhas de exibição: separador
 * de milhar ausente e centavos comidos.
 */
const PENDENTES: FixaPendente[] = [
    {
        descricao: 'Paulo',
        categoria: 'Salários',
        valorSugerido: 2725,
        referencia: '2026-07',
        categoriaId: 1,
    },
    {
        descricao: 'Luz',
        categoria: 'Utilidades',
        valorSugerido: 850.4,
        referencia: '2026-07',
        categoriaId: 2,
    },
];

let container: HTMLDivElement;
let root: Root;

const montar = (pendentes: FixaPendente[] = PENDENTES) => {
    act(() => {
        root.render(
            React.createElement(ModalFixasPendentes, {
                mes: '2026-08',
                pendentes,
                onCancelar: () => {},
                onLancar: async () => {},
            })
        );
    });
};

const campo = (descricao: string): HTMLInputElement => {
    const el = container.querySelector<HTMLInputElement>(
        `input[aria-label="Valor de ${descricao}"]`
    );
    if (!el) throw new Error(`Campo de valor de "${descricao}" não encontrado`);
    return el;
};

/**
 * Texto da tela com o espaço fino do `Intl` normalizado — `formatCurrency` separa
 * "R$" do número com NBSP (U+00A0), e comparar com espaço comum falha à toa.
 */
const texto = () => container.textContent?.replace(/\u00a0/g, ' ') ?? '';

/** Simula digitação: seta o valor pelo setter nativo e dispara `input`, como o React espera. */
const digitar = (input: HTMLInputElement, texto: string) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    )!.set!;
    act(() => {
        setter.call(input, texto);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe('ModalFixasPendentes — valores em padrão monetário', () => {
    it('exibe o valor sugerido com separador de milhar e 2 casas', () => {
        montar();
        expect(campo('Paulo').value).toBe('2.725,00');
    });

    it('completa a segunda casa decimal de um valor quebrado', () => {
        montar();
        expect(campo('Luz').value).toBe('850,40');
    });

    it('mostra o total do rodapé como moeda', () => {
        montar();
        expect(texto()).toContain('R$ 3.575,40');
    });

    it('aceita edição em formato brasileiro e mantém o valor em reais', () => {
        montar();
        digitar(campo('Paulo'), '3.100,55');
        expect(campo('Paulo').value).toBe('3.100,55');
        expect(texto()).toContain('R$ 3.950,95');
    });

    it('fica vazio quando o dono apaga tudo, em vez de exibir 0,00', () => {
        montar();
        digitar(campo('Luz'), '');
        expect(campo('Luz').value).toBe('');
        // Zerada a Luz, o total é só o Paulo — o campo vazio vale zero, não NaN.
        expect(texto()).toContain('R$ 2.725,00');
    });
});
