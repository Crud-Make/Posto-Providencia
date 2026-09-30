/**
 * Caracterização do `useFinanceiro` (caminho Supabase) ANTES de extrair a montagem para uma função
 * pura (#103): o snapshot guarda o que o hook produz hoje — resumo (receitas, despesas, lucro,
 * margem), produtos sem compra e cada transação. A extração tem de deixar este teste verde.
 */
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as React from 'react';
import { BICOS, CENARIOS, FILTROS } from './insumos-financeiros.fixture';

const cenario = vi.hoisted(() => ({ atual: 'Etanol sem compra' as string }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const periodo = () => CENARIOS[cenario.atual as keyof typeof CENARIOS];
const ok = <T,>(data: T) => ({ success: true as const, data, timestamp: '2026-09-28T00:00:00Z' });
const bicoPorId = new Map(BICOS.map((b) => [b.id, b]));
const combustivelPorId = new Map(BICOS.map((b) => [b.combustivel.id, b.combustivel]));

vi.mock('../../../services/api', () => ({
    leituraService: { getByDateRange: vi.fn(async () => ok(periodo().leituras.map((l) => ({ ...l, bico: bicoPorId.get(l.bico_id) })))) },
    despesaService: { getByDateRange: vi.fn(async () => ok(periodo().despesas)) },
    receitaService: {
        getByDateRange: vi.fn(async () => ok(periodo().receitas.map((r) => ({ ...r, Categoria: { nome: r.categoria } })))),
    },
    recebimentoService: {
        getByDateRange: vi.fn(async () => ok(periodo().recebimentos.map((r) => ({ id: r.id, valor: r.valor, forma_pagamento: { nome: r.forma }, fechamento: { data: r.data } })))),
    },
    compraService: {
        getByDateRange: vi.fn(async () => ok(periodo().compras.map((c) => ({ ...c, combustivel: combustivelPorId.get(c.combustivel_id), fornecedor: { nome: c.fornecedor } })))),
    },
}));

const { useFinanceiro } = await import('./useFinanceiro');

describe('useFinanceiro (Supabase) — o que produz hoje', () => {
    it.each(Object.keys(CENARIOS))('%s: resumo, produtos sem compra e transações', async (nome) => {
        cenario.atual = nome;
        const resultadoRef: { current: ReturnType<typeof useFinanceiro> | null } = { current: null };
        function Sonda(): null {
            const valor = useFinanceiro(FILTROS);
            React.useEffect(() => {
                resultadoRef.current = valor;
            });
            return null;
        }
        const container = document.createElement('div');
        const root = createRoot(container);
        await act(async () => { root.render(React.createElement(Sonda)); });
        await act(async () => { await Promise.resolve(); });

        expect(resultadoRef.current?.erro).toBeNull();
        expect(resultadoRef.current?.dados).toMatchSnapshot();
        act(() => root.unmount());
    });
});
