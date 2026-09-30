/**
 * As duas traduções do movimento do período para os {@link InsumosFinanceiros} da aba Receitas e
 * Despesas (#103): das linhas do Supabase (o que `useFinanceiro` lia) e das respostas da API. Só
 * formato — a conta é `montarDadosFinanceiros`, a mesma para as duas; o teste de paridade exige
 * números idênticos do mesmo período pelos dois lados.
 */
import type { Bico, Bomba, Combustivel, Compra, DBDespesa as Despesa, Fechamento, FormaPagamento, Fornecedor, Leitura, Recebimento } from '../../../types/database';
import type { Receita } from '../../../services/api/receita.service';
import type { PeriodoDaAbaPelaApi } from '../../../services/api/financeiro.api';
import type { InsumosFinanceiros } from './montar-dados-financeiros';

export type VendaDoSupabase = Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } };
export type RecebimentoDoSupabase = Recebimento & { forma_pagamento?: FormaPagamento | null; fechamento?: Partial<Fechamento> | null };
export type CompraDoSupabase = Compra & { combustivel?: Combustivel | null; fornecedor?: Fornecedor | null };

export interface LinhasDoSupabase {
    readonly vendas: readonly VendaDoSupabase[];
    readonly recebimentos: readonly RecebimentoDoSupabase[];
    readonly receitas: readonly Receita[];
    readonly despesas: readonly Despesa[];
    readonly compras: readonly CompraDoSupabase[];
}

/** As linhas do Supabase, com o combustível DO BICO em cada venda. */
export function insumosDoSupabase(l: LinhasDoSupabase): InsumosFinanceiros {
    return {
        vendas: l.vendas.map((v) => ({
            id: v.id, data: v.data, valor: v.valor_total, litros: v.litros_vendidos, produto: v.bico.combustivel.nome, bicoNumero: v.bico.numero,
        })),
        recebimentos: l.recebimentos.map((r) => ({ id: r.id, valor: r.valor, forma: r.forma_pagamento?.nome ?? null, data: r.fechamento?.data ?? null })),
        receitas: l.receitas.map((r) => ({ id: r.id, descricao: r.descricao, categoria: r.Categoria?.nome ?? null, valor: r.valor, data: r.data })),
        despesas: l.despesas.map((d) => ({ id: d.id, descricao: d.descricao, categoria: d.categoria ?? null, valor: d.valor, data: d.data })),
        compras: l.compras.map((c) => ({
            id: c.id, data: c.data, valor: c.valor_total, litros: c.quantidade_litros, produto: c.combustivel?.nome ?? null, fornecedor: c.fornecedor?.nome ?? null,
        })),
    };
}

/**
 * O dia da API no instante que o Supabase entregava: `Leitura`, `Compra` e `Fechamento` guardam
 * `timestamptz` à meia-noite UTC (regra do banco), e o PostgREST o serializa assim.
 */
const instante = (dia: string): string => `${dia}T00:00:00+00:00`;

/**
 * As respostas da API. Venda e compra não têm `id` no `/movimento` (a lista não as mostra e o
 * gráfico só soma): o índice da linha serve de chave. O fornecedor não vem — só entra na descrição
 * da compra, que a tela não exibe. O combustível da venda é o DO BICO, pelo catálogo.
 */
export function insumosDaApi(p: PeriodoDaAbaPelaApi): InsumosFinanceiros {
    const bico = new Map(p.bicos.map((b) => [b.id, b] as const));
    return {
        vendas: p.movimento.leituras.map((l, i) => {
            const doBico = bico.get(l.bico_id);
            return {
                id: i + 1, data: instante(l.data), valor: Number(l.valor_total), litros: Number(l.litros_vendidos),
                produto: doBico?.combustivel.nome ?? 'Combustível', bicoNumero: doBico?.numero ?? 0,
            };
        }),
        recebimentos: p.movimento.recebimentos.map((r) => ({ id: r.id, valor: Number(r.valor), forma: r.forma, data: instante(r.data) })),
        receitas: p.receitas.map((r) => ({ id: r.id, descricao: r.descricao, categoria: r.categoria, valor: Number(r.valor), data: r.data })),
        despesas: p.despesas.map((d) => ({ id: d.id, descricao: d.descricao, categoria: d.categoria, valor: Number(d.valor), data: d.data })),
        compras: p.movimento.compras.map((c, i) => ({
            id: i + 1, data: instante(c.data), valor: Number(c.valor_total), litros: Number(c.quantidade_litros),
            produto: p.nomesDeCombustivel.get(c.combustivel_id) ?? null, fornecedor: null,
        })),
    };
}
