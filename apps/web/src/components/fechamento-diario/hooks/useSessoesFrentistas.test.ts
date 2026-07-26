import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { Frentista } from '../../../types/database/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
    fechamentoFrentistaService: {
        getByDate: vi.fn(),
    },
    frentistaService: {
        getAll: vi.fn(),
    },
}));

import { useSessoesFrentistas } from './useSessoesFrentistas';
import { fechamentoFrentistaService } from '../../../services/api';

/** Harness mínimo pro hook (mesmo padrão de useSubmissaoFechamento.test.ts). */
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
    return { result: resultRef };
}

const frentistas: Frentista[] = [
    { id: 1, nome: 'Ana', ativo: true } as Frentista,
    { id: 2, nome: 'Beto', ativo: true } as Frentista,
];

describe('useSessoesFrentistas — reconstrução de status a partir do marcador em observacoes', () => {
    beforeEach(() => {
        vi.mocked(fechamentoFrentistaService.getByDate).mockResolvedValue({
            success: true,
            data: [
                {
                    id: 101,
                    frentista_id: 1,
                    valor_cartao: 0,
                    valor_cartao_debito: 0,
                    valor_cartao_credito: 0,
                    valor_nota: 0,
                    valor_pix: 0,
                    valor_dinheiro: 0,
                    valor_moedas: 0,
                    baratao: 0,
                    encerrante: 0,
                    valor_conferido: 0,
                    observacoes: '[CONFERIDO] tudo certo',
                    data_hora_envio: null,
                },
                {
                    id: 102,
                    frentista_id: 2,
                    valor_cartao: 0,
                    valor_cartao_debito: 0,
                    valor_cartao_credito: 0,
                    valor_nota: 0,
                    valor_pix: 0,
                    valor_dinheiro: 0,
                    valor_moedas: 0,
                    baratao: 0,
                    encerrante: 0,
                    valor_conferido: 0,
                    observacoes: '',
                    data_hora_envio: null,
                },
            ],
            timestamp: new Date().toISOString(),
        } as never);
    });

    it('marca como "conferido" a sessão cuja observacoes contém o marcador, e "pendente" as demais', async () => {
        const { result } = renderHook(() => useSessoesFrentistas(1, frentistas));

        await act(async () => {
            await result.current.carregarSessoes('2026-07-26', 1);
        });

        const sessaoAna = result.current.sessoes.find(s => s.frentistaId === 1);
        const sessaoBeto = result.current.sessoes.find(s => s.frentistaId === 2);

        expect(sessaoAna?.status).toBe('conferido');
        expect(sessaoBeto?.status).toBe('pendente');
    });
});
