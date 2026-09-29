/**
 * Configurações pela API (#103): formas de pagamento e parâmetros com `VITE_API_CONFIGURACOES`.
 * O Supabase não entra; o posto vai na rota; o "Excluir" desativa e some da lista; no BR (posto
 * sem as linhas de parâmetro) a tela mantém o padrão e o salvar vai num PUT só.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import { errAsync, okAsync } from 'neverthrow';
import type { FormaPagamento } from '../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({
    gravarFormaNaApi: vi.fn(),
    lerParametrosDaApi: vi.fn(),
    gravarParametrosNaApi: vi.fn(),
}));
vi.mock('../../../services/api/configuracoes.api', async (original) => ({
    ...(await original<typeof import('../../../services/api/configuracoes.api')>()),
    configuracoesPelaApi: () => true,
    ...api,
}));
const supabase = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), getAll: vi.fn() }));
vi.mock('../../../services/api', () => ({ formaPagamentoService: supabase, configuracaoService: supabase }));

const { useFormaPagamento } = await import('./useFormaPagamento');
const { useParametros } = await import('./useParametros');

const alerta = vi.fn();
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', alerta);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
});

async function monta<T>(usar: () => T): Promise<{ current: T }> {
    const ref = { current: undefined as unknown as T };
    function Sonda(): null {
        ref.current = usar();
        return null;
    }
    await act(async () => { root.render(React.createElement(Sonda)); });
    return ref;
}

const pix: FormaPagamento = { id: '5', name: 'Pix', type: 'venda' as FormaPagamento['type'], tax: 0, active: true };
const debito: FormaPagamento = { id: '6', name: 'Débito', type: 'venda' as FormaPagamento['type'], tax: 1.5, active: true };

describe('formas de pagamento pela API', () => {
    it('nova forma vai para a API com o posto da rota e a taxa em string; entra na lista', async () => {
        api.gravarFormaNaApi.mockImplementation(() => okAsync({ id: 9, nome: 'Crédito', tipo: 'cartao_credito', ativo: true, taxa: '3.50' }));
        let lista: FormaPagamento[] = [pix];
        const setLista = vi.fn((f: React.SetStateAction<FormaPagamento[]>) => { lista = typeof f === 'function' ? f(lista) : f; });
        const hook = await monta(() => useFormaPagamento(2, setLista, lista));

        await act(async () => { hook.current.openPaymentModal(); });
        await act(async () => {
            hook.current.handleFormChange('name', 'Crédito');
            hook.current.handleFormChange('type', 'cartao_credito');
            hook.current.handleFormChange('tax', 3.5);
        });
        await act(async () => { await hook.current.handleSavePayment(); });

        expect(api.gravarFormaNaApi).toHaveBeenCalledWith(2, null, { nome: 'Crédito', tipo: 'cartao_credito', taxa: '3.50', ativo: true });
        expect(lista.map((f) => f.name)).toEqual(['Pix', 'Crédito']);
        expect(supabase.create).not.toHaveBeenCalled();
    });

    it('"Excluir" desativa pela API (forma inteira, ativo false) e some da lista', async () => {
        api.gravarFormaNaApi.mockImplementation(() => okAsync({ id: 6, nome: 'Débito', tipo: 'venda', ativo: false, taxa: '1.50' }));
        let lista: FormaPagamento[] = [pix, debito];
        const setLista = vi.fn((f: React.SetStateAction<FormaPagamento[]>) => { lista = typeof f === 'function' ? f(lista) : f; });
        const hook = await monta(() => useFormaPagamento(2, setLista, lista));

        expect(hook.current.handleDelete).toBeDefined();
        await act(async () => { await hook.current.handleDelete?.('6'); });

        expect(api.gravarFormaNaApi).toHaveBeenCalledWith(2, '6', { nome: 'Débito', tipo: 'venda', taxa: '1.50', ativo: false });
        expect(lista.map((f) => f.id)).toEqual(['5']);
        expect(supabase.update).not.toHaveBeenCalled();
    });

    it('nome repetido: a frase do servidor aparece e a lista não muda', async () => {
        api.gravarFormaNaApi.mockImplementation(() => errAsync({
            tipo: 'recusado', status: 422, codigo: 'nome_repetido', mensagem: 'Já existe uma forma de pagamento com este nome neste posto (mesmo desativada).',
        }));
        const setLista = vi.fn();
        const hook = await monta(() => useFormaPagamento(2, setLista, [pix]));

        await act(async () => { hook.current.openPaymentModal(); });
        await act(async () => { hook.current.handleFormChange('name', 'Pix'); });
        await act(async () => { await hook.current.handleSavePayment(); });

        expect(alerta).toHaveBeenCalledWith('Já existe uma forma de pagamento com este nome neste posto (mesmo desativada).');
        expect(setLista).not.toHaveBeenCalled();
    });
});

describe('parâmetros pela API', () => {
    it('posto sem as linhas (BR): mantém o padrão da tela; salvar manda um PUT só com o corpo certo', async () => {
        api.lerParametrosDaApi.mockImplementation(() => okAsync({ tolerancia_divergencia: null, dias_estoque_critico: null, dias_estoque_baixo: null }));
        api.gravarParametrosNaApi.mockImplementation(() => okAsync({ tolerancia_divergencia: '25.50', dias_estoque_critico: '3', dias_estoque_baixo: '7' }));
        const hook = await monta(() => useParametros(2));

        expect(hook.current.tolerance).toBe('50.00');
        await act(async () => { hook.current.updateTolerance('25,5'); });
        await act(async () => { await hook.current.handleSaveConfigs(); });

        expect(api.gravarParametrosNaApi).toHaveBeenCalledWith(2, { tolerancia_divergencia: '25.5', dias_estoque_critico: 3, dias_estoque_baixo: 7 });
        expect(hook.current.tolerance).toBe('25.50');
        expect(hook.current.configsModified).toBe(false);
        expect(supabase.update).not.toHaveBeenCalled();
    });
});
