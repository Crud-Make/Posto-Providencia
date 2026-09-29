import { describe, expect, it } from 'vitest';
import { dadosDasDespesas } from './useDespesasDaApi';

const despesa = (id: number, categoria: string | null, data: string, valor = '10.00') => ({
    id, descricao: `D${id}`, categoria, categoria_id: null, valor, data, status: 'pendente', recorrente: false, data_pagamento: null, observacoes: null,
});

describe('dadosDasDespesas — a lista da aba no modo API, no formato de useFinanceiro', () => {
    const lista = [despesa(1, 'Energia', '2026-09-02', '850.00'), despesa(2, null, '2026-09-20', '99.90'), despesa(3, 'Energia', '2026-09-10')];
    const base = { dataInicio: '2026-09-01', dataFim: '2026-09-30', postoId: 2 };

    it('transações de despesa, `desp-<id>`, categoria ou "Geral", data decrescente, valor em number', () => {
        const { transacoes } = dadosDasDespesas(lista, base);
        expect(transacoes.map((t) => t.id)).toEqual(['desp-2', 'desp-3', 'desp-1']);
        expect(transacoes[0]).toEqual({ id: 'desp-2', tipo: 'despesa', categoria: 'Geral', descricao: 'D2', valor: 99.9, data: '2026-09-20', origem: 'despesa' });
    });

    it('respeita os filtros de categoria e de tipo', () => {
        expect(dadosDasDespesas(lista, { ...base, categoria: 'Energia' }).transacoes.map((t) => t.id)).toEqual(['desp-3', 'desp-1']);
        expect(dadosDasDespesas(lista, { ...base, tipoTransacao: 'receita' }).transacoes).toEqual([]);
    });

    it('o resumo sai vazio (não vem por esta aba no modo API) — nunca um lucro inventado', () => {
        const dados = dadosDasDespesas(lista, base);
        expect(dados.lucro).toEqual({ bruto: null, liquido: null, margem: null });
        expect(dados.despesas.total).toBeNull();
    });
});
