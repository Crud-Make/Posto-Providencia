import { custoLitrosVendidos, type ProdutoDoPeriodo } from '@posto/utils';
import { resumoFinanceiro } from './calculos-financeiro';
import type { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import type { DadosFinanceiros, Transacao } from './useFinanceiro';

/**
 * O movimento do período já traduzido da fonte (Supabase ou API), no mínimo que a aba Receitas e
 * Despesas usa (#103). Os valores chegam como a fonte os tem (reais em `number`); nenhuma conta é
 * feita na tradução — toda conta é a de {@link montarDadosFinanceiros}, igual para as duas fontes.
 */
export interface InsumosFinanceiros {
    /** Uma linha por Leitura; `produto` é o nome do combustível DO BICO (não o da Leitura). */
    readonly vendas: readonly { id: number; data: string; valor: number | null; litros: number | null; produto: string; bicoNumero: number }[];
    /** Recebimentos do fechamento do período: entram na lista (e no gráfico), não no lucro. */
    readonly recebimentos: readonly { id: number; valor: number; forma: string | null; data: string | null }[];
    readonly receitas: readonly { id: number; descricao: string; categoria: string | null; valor: number; data: string }[];
    readonly despesas: readonly { id: number; descricao: string; categoria: string | null; valor: number; data: string }[];
    /** `produto` é o nome do combustível da compra; sem ele a compra não entra no custo. */
    readonly compras: readonly { id: number; data: string; valor: number; litros: number | null; produto: string | null; fornecedor: string | null }[];
}

/**
 * A montagem da aba Receitas e Despesas, tirada de `useFinanceiro` sem mudar nada (#103): as
 * transações, o custo dos litros vendidos (litros da Leitura × custo médio de compra do período,
 * modelo da planilha; sem compra de um produto vendido o custo é `null` e o card diz qual) e o
 * resumo. Recebimentos NÃO entram na receita: já estão nas vendas via formas de pagamento.
 */
/** O `x || 0` de antes, explícito: nulo ou NaN vira 0 (e 0 continua 0). */
function ouZero(n: number | null): number {
    return n === null || Number.isNaN(n) ? 0 : n;
}

/** O `x || 'padrão'` de antes, explícito: nulo ou texto vazio usa o padrão. */
function ouTexto(s: string | null, padrao: string): string {
    return s === null || s === '' ? padrao : s;
}

export function montarDadosFinanceiros(insumos: InsumosFinanceiros, filtros: FiltrosFinanceiros): DadosFinanceiros {
    const transacoes = [
        ...transacoesDeVenda(insumos),
        ...transacoesDeRecebimento(insumos, filtros.dataInicio),
        ...transacoesDeReceita(insumos),
        ...transacoesDeDespesa(insumos),
        ...transacoesDeCompra(insumos),
    ];

    const totalVendas = insumos.vendas.reduce((acc, v) => acc + ouZero(v.valor), 0);
    const totalReceitasExtras = insumos.receitas.reduce((acc, r) => acc + ouZero(r.valor), 0);
    const totalDespesasOps = insumos.despesas.reduce((acc, d) => acc + ouZero(d.valor), 0);
    const custo = custoLitrosVendidos(produtosDoPeriodo(insumos));

    const resumo = resumoFinanceiro({
        receitaVendas: totalVendas,
        receitasExtras: totalReceitasExtras,
        custoLitrosVendidos: custo.custo,
        despesasOps: totalDespesasOps,
    });

    return { ...resumo, produtosSemCompra: custo.produtosSemCompra, transacoes: filtrar(ordenar(transacoes), filtros) };
}

function transacoesDeVenda(i: InsumosFinanceiros): Transacao[] {
    return i.vendas.map((v) => ({
        id: `venda-${v.id}`, tipo: 'receita', categoria: 'Venda de Combustível',
        descricao: `Venda ${v.produto} - Bico ${v.bicoNumero}`, valor: ouZero(v.valor), data: v.data, origem: 'venda',
    }));
}

function transacoesDeRecebimento(i: InsumosFinanceiros, dataInicio: string): Transacao[] {
    return i.recebimentos.map((r) => ({
        id: `rec-${r.id}`, tipo: 'receita', categoria: 'Recebimento',
        descricao: `Recebimento ${ouTexto(r.forma, 'Diversos')}`, valor: r.valor, data: ouTexto(r.data, dataInicio), origem: 'recebimento',
    }));
}

function transacoesDeReceita(i: InsumosFinanceiros): Transacao[] {
    return i.receitas.map((r) => ({
        id: `recextra-${r.id}`, tipo: 'receita', categoria: ouTexto(r.categoria, 'Outros'),
        descricao: r.descricao, valor: r.valor, data: r.data, origem: 'receita_extra',
    }));
}

function transacoesDeDespesa(i: InsumosFinanceiros): Transacao[] {
    return i.despesas.map((d) => ({
        id: `desp-${d.id}`, tipo: 'despesa', categoria: ouTexto(d.categoria, 'Geral'),
        descricao: d.descricao, valor: d.valor, data: d.data, origem: 'despesa',
    }));
}

/** Compras entram na lista como saída de caixa; no lucro o que pesa é o custo dos litros vendidos. */
function transacoesDeCompra(i: InsumosFinanceiros): Transacao[] {
    return i.compras.map((c) => ({
        id: `compra-${c.id}`, tipo: 'despesa', categoria: 'Compra de Combustível',
        descricao: `Compra ${ouTexto(c.produto, 'Combustível')} - ${ouTexto(c.fornecedor, 'Fornecedor')}`, valor: c.valor, data: c.data, origem: 'compra',
    }));
}

/** Litros vendidos por produto e as compras de cada um — só os produtos com venda. */
function produtosDoPeriodo(i: InsumosFinanceiros): ProdutoDoPeriodo[] {
    const litrosPorProduto = new Map<string, number>();
    for (const v of i.vendas) {
        litrosPorProduto.set(v.produto, (litrosPorProduto.get(v.produto) ?? 0) + ouZero(v.litros));
    }
    const comprasPorProduto = new Map<string, { litros: number; valorTotal: number }[]>();
    for (const c of i.compras) {
        if (c.produto === null || c.produto === '') continue;
        const lista = comprasPorProduto.get(c.produto) ?? [];
        lista.push({ litros: ouZero(c.litros), valorTotal: ouZero(c.valor) });
        comprasPorProduto.set(c.produto, lista);
    }
    return [...litrosPorProduto].map(([produto, litrosVendidos]) => ({ produto, litrosVendidos, compras: comprasPorProduto.get(produto) ?? [] }));
}

/** Data decrescente, como antes. */
function ordenar(transacoes: Transacao[]): Transacao[] {
    return transacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/** Os filtros locais de tipo e categoria (o de data já veio na leitura). */
function filtrar(transacoes: Transacao[], filtros: FiltrosFinanceiros): Transacao[] {
    let filtradas = transacoes;
    if (filtros.tipoTransacao !== undefined && filtros.tipoTransacao !== 'todas') {
        filtradas = filtradas.filter((t) => t.tipo === filtros.tipoTransacao);
    }
    if (filtros.categoria !== undefined && filtros.categoria !== '') {
        filtradas = filtradas.filter((t) => t.categoria === filtros.categoria);
    }
    return filtradas;
}
