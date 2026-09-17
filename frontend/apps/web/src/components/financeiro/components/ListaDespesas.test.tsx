import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { ListaDespesas } from './ListaDespesas';
import type { DadosFinanceiros, Transacao } from '../hooks/useFinanceiro';

/**
 * Transações do período com as três origens que importam para esta lista:
 * despesas operacionais (entram), uma venda (receita, sai) e uma compra de
 * combustível (despesa mas `origem: 'compra'`, sai). Espelha o replay de janeiro.
 */
const TRANSACOES: Transacao[] = [
    { id: 'd1', tipo: 'despesa', categoria: 'Folha de Pagamento', descricao: 'Sinho', valor: 1600, data: '2026-01-01', origem: 'despesa' },
    { id: 'd2', tipo: 'despesa', categoria: 'Folha de Pagamento', descricao: 'Barbra', valor: 1444, data: '2026-01-01', origem: 'despesa' },
    { id: 'd3', tipo: 'despesa', categoria: 'Impostos', descricao: 'IRPJ', valor: 1962.92, data: '2026-01-01', origem: 'despesa' },
    { id: 'd4', tipo: 'despesa', categoria: 'Frete', descricao: 'Frete', valor: 5640, data: '2026-01-01', origem: 'despesa' },
    // Ruído que NÃO deve aparecer:
    { id: 'v1', tipo: 'receita', categoria: 'Venda de Combustível', descricao: 'Venda Gasolina', valor: 9430.34, data: '2026-01-01', origem: 'venda' },
    { id: 'c1', tipo: 'despesa', categoria: 'Compra de Combustível', descricao: 'Compra Gasolina', valor: 165700, data: '2026-01-01', origem: 'compra' },
];

const dados = (transacoes: Transacao[]): DadosFinanceiros => ({
    receitas: { total: 0, vendas: 0, extras: 0 },
    despesas: { total: 0, operacionais: 0, compras: 0 },
    lucro: { bruto: 0, liquido: 0, margem: 0 },
    produtosSemCompra: [],
    transacoes,
});

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

const render = (transacoes: Transacao[]) =>
    act(() => {
        root.render(<ListaDespesas dados={dados(transacoes)} />);
    });

describe('ListaDespesas', () => {
    it('mostra só despesas operacionais: exclui receita e compra de combustível', () => {
        render(TRANSACOES);
        const txt = (container.textContent ?? '').replace(/\u00A0/g, ' ');

        expect(txt).toContain('Sinho');
        expect(txt).toContain('Frete');
        // Receita e compra ficam de fora — o foco é a saída operacional.
        expect(txt).not.toContain('Venda Gasolina');
        expect(txt).not.toContain('Compra Gasolina');
    });

    it('agrupa por categoria e soma o subtotal de cada uma', () => {
        render(TRANSACOES);
        const txt = (container.textContent ?? '').replace(/\u00A0/g, ' ');

        // Folha de Pagamento tem 2 itens (1600 + 1444 = 3044).
        expect(txt).toContain('Folha de Pagamento');
        expect(txt).toContain('R$ 3.044,00');
        // Impostos com 1 item aqui.
        expect(txt).toContain('Impostos');
    });

    it('o total é a soma só das operacionais, sem a compra de 165.700', () => {
        render(TRANSACOES);
        const txt = (container.textContent ?? '').replace(/\u00A0/g, ' ');

        // 1600 + 1444 + 1962,92 + 5640 = 10.646,92 — NÃO inclui a compra.
        expect(txt).toContain('R$ 10.646,92');
        expect(txt).not.toContain('165.700');
    });

    it('período sem despesa mostra o estado vazio, não quebra', () => {
        render([TRANSACOES[4]]); // só a receita
        const txt = (container.textContent ?? '').replace(/\u00A0/g, ' ');
        expect(txt).toContain('Nenhuma despesa no período selecionado.');
    });
});
