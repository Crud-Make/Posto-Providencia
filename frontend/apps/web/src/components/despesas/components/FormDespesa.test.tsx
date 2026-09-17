import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// O formulário busca as categorias no Supabase ao montar; aqui só o campo de
// dinheiro interessa, então a lista chega vazia.
vi.mock('../../../services/api/categoria.service', () => ({
    categoriaService: { getAll: vi.fn().mockResolvedValue([]) },
}));

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import FormDespesa from './FormDespesa';
import type { Despesa } from '../types';

/** Despesa real de julho: salário do Paulo, valor redondo na casa dos milhares. */
const DESPESA: Despesa = {
    id: 1,
    descricao: 'Paulo',
    categoria: 'Folha de Pagamento',
    valor: 2725,
    data: '2026-07-05',
    status: 'pago',
    data_pagamento: '2026-07-05',
    observacoes: '',
    posto_id: 1,
} as unknown as Despesa;

let container: HTMLDivElement;
let root: Root;

/** O campo não tem `id` nem `htmlFor`; o placeholder é o único gancho estável hoje. */
const campoValor = (): HTMLInputElement => {
    const el = container.querySelector<HTMLInputElement>('input[placeholder="0,00"]');
    if (!el) throw new Error('Campo "Valor" não encontrado');
    return el;
};

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

const montar = (onSave = vi.fn().mockResolvedValue(true), initialData: Despesa | null = DESPESA) => {
    act(() => {
        root.render(
            React.createElement(FormDespesa, {
                initialData,
                postoId: 1,
                onSave,
                onCancel: () => {},
            })
        );
    });
    return onSave;
};

describe('FormDespesa — campo de valor em padrão monetário', () => {
    it('abre a edição com o valor formatado como moeda', () => {
        montar();
        expect(campoValor().value).toBe('2.725,00');
    });

    it('abre a despesa nova com o campo vazio, deixando o placeholder aparecer', () => {
        montar(vi.fn(), null);
        // Zero escrito no campo esconde o placeholder e ainda satisfaz o `required`,
        // que passaria a aceitar lançamento de R$ 0,00 sem reclamar.
        expect(campoValor().value).toBe('');
        expect(campoValor().required).toBe(true);
    });

    it('aceita digitação em formato brasileiro e salva o valor em reais', async () => {
        const onSave = montar();
        digitar(campoValor(), '3.100,55');
        expect(campoValor().value).toBe('3.100,55');

        await act(async () => {
            container.querySelector('form')!.dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            );
        });

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ valor: 3100.55 }),
            DESPESA.id
        );
    });
});
