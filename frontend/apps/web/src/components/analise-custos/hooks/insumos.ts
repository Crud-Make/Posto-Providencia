/**
 * Insumos da Análise de Custos — o que a tela lê do mês, venha do Supabase ou da API Laravel.
 *
 * @remarks
 * As duas fontes (`fonte-supabase.ts`, `fonte-da-api.ts`) entregam este MESMO formato, e só
 * `montar-analise.ts` faz conta com ele. É o que garante que trocar a fonte não muda número —
 * provado em `carregar-analise.test.ts` (paridade).
 */
import type { CompraParaCusto } from '../../../services/custo-do-mes';

/** Um produto da análise: o cadastro que dá nome, cor e o preço de bomba de hoje. */
export interface ProdutoDaAnalise {
    readonly combustivelId: number;
    readonly nome: string;
    readonly codigo: string;
    /** `Combustivel.preco_venda` atual — a margem bruta da tela é sobre ele. */
    readonly precoVenda: number;
}

/** O que um combustível vendeu no mês: Σ `Leitura.litros_vendidos` e Σ `Leitura.valor_total`. */
export interface VendaDoMes {
    readonly litros: number;
    readonly receita: number;
}

/** Tudo o que a análise de UM mês civil precisa, já recortado ao mês e ao posto. */
export interface InsumosDaAnalise {
    /** Na ordem em que a tela os mostra. */
    readonly produtos: readonly ProdutoDaAnalise[];
    /** Venda do mês por `combustivel_id`; combustível sem venda não tem entrada. */
    readonly vendas: ReadonlyMap<number, VendaDoMes>;
    /** Σ `Despesa.valor` de competência no mês (a taxa de cartão já é uma delas). */
    readonly totalDespesas: number;
    /** Σ `Leitura.litros_vendidos` de TODOS os combustíveis no mês — o divisor do rateio. */
    readonly litrosDoMes: number;
    /** Compras do mês, insumo de `custoMedioPorCombustivel` (`services/custo-do-mes.ts`). */
    readonly compras: readonly CompraParaCusto[];
}

/** Primeiro e último dia do mês, `aaaa-mm-dd` — os mesmos textos que o aggregator montava. */
export function limitesDoMes(ano: number, mes: number): { readonly inicio: string; readonly fim: string } {
    const mm = String(mes).padStart(2, '0');
    return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${new Date(ano, mes, 0).getDate()}` };
}
