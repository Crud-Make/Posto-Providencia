/**
 * `useConfiguracoesData` — o hook desembrulha o envelope do service.
 *
 * Desde 22/02/2026 (`ad89a73`) o hook lia `data?.products` no ENVELOPE
 * `{ success, data }` e o `|| []` escondia o `undefined`: a tela de
 * Configurações mostrava "Nenhum produto cadastrado" num posto com 4
 * combustíveis. Este é o teste que teria pego — e que não existia.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
    fetchSettingsData: vi.fn(),
}));

vi.mock('../../../contexts/usePosto', () => ({
    usePosto: () => ({ postoAtivoId: 1 }),
}));

import { fetchSettingsData } from '../../../services/api';
import { useConfiguracoesData } from './useConfiguracoesData';

function renderHook<T>(useHookFn: () => T) {
    const resultRef: { current: T } = { current: undefined as unknown as T };
    function TestComponent() {
        const value = useHookFn();
        React.useEffect(() => {
            resultRef.current = value;
        });
        return null;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
        root = createRoot(container);
        root.render(React.createElement(TestComponent));
    });
    return { result: resultRef, desmontar: () => act(() => root.unmount()) };
}

/** O envelope exatamente como `createSuccessResponse` o monta. */
const ENVELOPE = {
    success: true as const,
    timestamp: '2026-09-06T00:00:00Z',
    data: {
        products: [
            { id: '1', name: 'Gasolina Comum', type: 'Combustível' as const, price: 6.98 },
            { id: '3', name: 'Etanol', type: 'Biocombustível' as const, price: 4.98 },
        ],
        nozzles: [{ id: '1', number: '1', productName: 'Gasolina Comum', tankSource: 'Bomba 1' }],
        shifts: [],
        paymentMethods: [{ id: '1', name: 'Dinheiro', type: 'dinheiro' as const, tax: 0, active: true }],
    },
};

describe('useConfiguracoesData — desembrulha o envelope do service', () => {
    beforeEach(() => {
        vi.mocked(fetchSettingsData).mockReset();
    });

    it('preenche produtos, bicos e formas de pagamento a partir de `resposta.data`', async () => {
        vi.mocked(fetchSettingsData).mockResolvedValue(ENVELOPE);
        const { result, desmontar } = renderHook(() => useConfiguracoesData());

        await act(async () => {
            await Promise.resolve();
        });

        // ANTES: `data?.products` no envelope → undefined → `[]` — "Nenhum produto cadastrado".
        expect(result.current.products).toHaveLength(2);
        expect(result.current.products[0]).toEqual({ id: '1', name: 'Gasolina Comum', type: 'Combustível', price: 6.98 });
        expect(result.current.nozzles).toHaveLength(1);
        expect(result.current.paymentMethods).toHaveLength(1);
        expect(result.current.loading).toBe(false);
        desmontar();
    });

    it('resposta de erro deixa as listas vazias, sem estourar', async () => {
        vi.mocked(fetchSettingsData).mockResolvedValue({
            success: false as const,
            error: { message: 'RLS', code: 'FETCH_ERROR' },
            timestamp: '2026-09-06T00:00:00Z',
        } as never);
        const { result, desmontar } = renderHook(() => useConfiguracoesData());

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.products).toEqual([]);
        expect(result.current.nozzles).toEqual([]);
        expect(result.current.paymentMethods).toEqual([]);
        desmontar();
    });
});
