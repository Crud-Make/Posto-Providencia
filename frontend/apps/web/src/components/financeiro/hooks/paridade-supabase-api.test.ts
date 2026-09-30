/**
 * PARIDADE da aba Receitas e Despesas (#103): o mesmo período, traduzido das linhas do Supabase e
 * das respostas da API, tem de dar os MESMOS números — resumo (receitas, despesas, lucro bruto e
 * líquido, margem), produtos sem compra e cada transação no que a tela usa. Venda e compra só
 * diferem no `id` (a API não o manda; a lista não as mostra) e na descrição da compra (sem
 * fornecedor; a tela não a exibe). O gráfico sai das transações (data, tipo, valor) e dos totais:
 * se estes batem, o gráfico bate.
 */
import { describe, expect, it } from 'vitest';
import type { PeriodoDaAbaPelaApi } from '../../../services/api/financeiro.api';
import { BICOS, CENARIOS, FILTROS, GC, ET } from './insumos-financeiros.fixture';
import { insumosDaApi, insumosDoSupabase, type LinhasDoSupabase } from './insumos-financeiros';
import { montarDadosFinanceiros } from './montar-dados-financeiros';
import type { Transacao } from './useFinanceiro';

type Periodo = (typeof CENARIOS)[keyof typeof CENARIOS];
const bicoPorId = new Map(BICOS.map((b) => [b.id, b]));
const combustivelPorId = new Map([GC, ET].map((c) => [c.id, c]));
const dia = (instante: string): string => instante.slice(0, 10);
const texto = (n: number): string => n.toFixed(2);

/** O período como o Supabase o entregava a `useFinanceiro`. */
function doSupabase(p: Periodo): LinhasDoSupabase {
    return {
        vendas: p.leituras.map((l) => ({ ...l, bico: bicoPorId.get(l.bico_id) })),
        recebimentos: p.recebimentos.map((r) => ({ id: r.id, valor: r.valor, forma_pagamento: { nome: r.forma }, fechamento: { data: r.data } })),
        receitas: p.receitas.map((r) => ({ ...r, Categoria: { nome: r.categoria } })),
        despesas: p.despesas,
        compras: p.compras.map((c) => ({ ...c, combustivel: combustivelPorId.get(c.combustivel_id), fornecedor: { nome: c.fornecedor } })),
    } as unknown as LinhasDoSupabase;
}

/** O MESMO período como a API o entrega (decimais em string, dias em AAAA-MM-DD). */
function daApi(p: Periodo): PeriodoDaAbaPelaApi {
    return {
        movimento: {
            leituras: p.leituras.map((l) => ({ bico_id: l.bico_id, data: dia(l.data), litros_vendidos: String(l.litros_vendidos), valor_total: texto(l.valor_total) })),
            compras: p.compras.map((c) => ({ combustivel_id: c.combustivel_id, data: dia(c.data), quantidade_litros: String(c.quantidade_litros), valor_total: texto(c.valor_total) })),
            recebimentos: p.recebimentos.map((r) => ({ id: r.id, data: dia(r.data), valor: texto(r.valor), forma: r.forma })),
        },
        despesas: p.despesas.map((d) => ({ ...d, valor: texto(d.valor), status: 'pendente', recorrente: false, categoria_id: null, data_pagamento: null, observacoes: null })),
        receitas: p.receitas.map((r) => ({ ...r, valor: texto(r.valor) })),
        bicos: BICOS.map((b) => ({ id: b.id, numero: b.numero, ativo: true, bomba: { id: 1, nome: 'BOMBA 01', localizacao: null, ativo: true }, combustivel: { ...b.combustivel, cor: null, ativo: true, preco_venda: '0', preco_custo: null }, tanque: null })),
        nomesDeCombustivel: new Map([GC, ET].map((c) => [c.id, c.nome])),
    };
}

/** O que a tela usa de uma transação: tudo, menos o `id` e a descrição de venda e compra. */
const semChave = (t: Transacao) => (t.origem === 'venda' || t.origem === 'compra' ? { tipo: t.tipo, categoria: t.categoria, valor: t.valor, data: t.data, origem: t.origem } : t);

describe.each(Object.entries(CENARIOS))('paridade Supabase × API — %s', (_nome, periodo) => {
    const peloSupabase = montarDadosFinanceiros(insumosDoSupabase(doSupabase(periodo)), FILTROS);
    const pelaApi = montarDadosFinanceiros(insumosDaApi(daApi(periodo)), FILTROS);

    it('mesmo resumo: receitas, despesas, lucro bruto e líquido, margem', () => {
        expect(pelaApi.receitas).toEqual(peloSupabase.receitas);
        expect(pelaApi.despesas).toEqual(peloSupabase.despesas);
        expect(pelaApi.lucro).toEqual(peloSupabase.lucro);
        expect(pelaApi.produtosSemCompra).toEqual(peloSupabase.produtosSemCompra);
    });

    it('mesmas transações, na mesma ordem (o que a lista e o gráfico usam)', () => {
        expect(pelaApi.transacoes.map(semChave)).toEqual(peloSupabase.transacoes.map(semChave));
    });

    it('a venda conta no combustível DO BICO, não no da Leitura, nos dois caminhos', () => {
        const vendaDoBico2 = (d: typeof pelaApi) => d.transacoes.filter((t) => t.origem === 'venda').map((t) => t.descricao);
        expect(vendaDoBico2(pelaApi)).toContain('Venda Etanol - Bico 2');
        expect(vendaDoBico2(peloSupabase)).toContain('Venda Etanol - Bico 2');
    });
});
