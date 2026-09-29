import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { emCentavos } from '@posto/utils';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

/**
 * A aba Receitas e Despesas do Fechamento de Caixa pela API Laravel (#103): lançar despesas (Nova
 * Despesa, Despesas Fixas, Taxas de Cartão) em lote idempotente, listar as do período ou as
 * recorrentes, e as categorias. O posto vai na ROTA. Nenhuma conta aqui: `data` e `valor` vão
 * como a tela os decidiu.
 */

/** `true` quando a aba fala com a API. Flag `VITE_API_DESPESAS`; ausente, vale o `VITE_API_URL`. */
export function despesasPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_DESPESAS);
}

/** Espelha `DespesaResource.php`. `valor` chega em string decimal. */
const despesaDaApi = z.object({
    id: z.number().int(),
    descricao: z.string(),
    categoria: z.string().nullable(),
    categoria_id: z.number().int().nullable(),
    valor: z.string().regex(/^-?\d+(\.\d+)?$/, 'valor fora de string decimal'),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data fora de AAAA-MM-DD'),
    status: z.string().nullable(),
    recorrente: z.boolean(),
    data_pagamento: z.string().nullable(),
    observacoes: z.string().nullable(),
});

export type DespesaDaApi = z.infer<typeof despesaDaApi>;

const categoriaDaApi = z.object({ id: z.number().int(), nome: z.string(), tipo: z.string(), cor: z.string().nullable() });

export type CategoriaDaApi = z.infer<typeof categoriaDaApi>;

/** Uma despesa do lote — espelha um item de `LancaDespesasRequest.php`. */
export interface DespesaParaLancar {
    readonly descricao: string;
    readonly categoria: string | null;
    readonly categoria_id: number | null;
    readonly valor: string;
    readonly data: string;
    readonly status: 'pendente' | 'pago';
    readonly recorrente: boolean;
    readonly data_pagamento: string | null;
    readonly observacoes: string | null;
}

/**
 * O valor da tela (reais, `number`) em string decimal com 2 casas, quantizado pelo `emCentavos`
 * canônico — o servidor recusa número de JSON para dinheiro não passar por float.
 */
export function valorEmTexto(reais: number): string {
    return emCentavos(reais).toFixed(2);
}

/** A despesa da API no formato que a tela já usava (`valor` em `number`, como o PostgREST entregava). */
export function paraDespesaDaTela(d: DespesaDaApi): DespesaDaApi & { readonly valorEmReais: number } {
    return { ...d, valorEmReais: Number(d.valor) };
}

const listaDeDespesas = z.object({ data: z.array(despesaDaApi) });

/** As despesas do período, competência pela `data` (`inicio` e `fim` inclusivos). */
export function lerDespesasDoPeriodo(postoId: number, inicio: string, fim: string): ResultAsync<DespesaDaApi[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/despesas?inicio=${inicio}&fim=${fim}`, listaDeDespesas).map((r) => r.data);
}

/** Todas as recorrentes do posto, de qualquer data — a base das Despesas Fixas pendentes. */
export function lerDespesasRecorrentes(postoId: number): ResultAsync<DespesaDaApi[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/despesas?recorrentes=1`, listaDeDespesas).map((r) => r.data);
}

/** Lança o lote; a mesma `chave` de novo devolve as linhas já gravadas, sem lançar em dobro. */
export function lancarDespesasNaApi(postoId: number, chave: string, despesas: readonly DespesaParaLancar[]): ResultAsync<DespesaDaApi[], ErroDaApi> {
    return enviarParaApi(
        `/api/postos/${postoId}/despesas`,
        'POST',
        { chave, despesas },
        z.object({ data: z.object({ repetido: z.boolean(), despesas: z.array(despesaDaApi) }) }),
    ).map((r) => r.data.despesas);
}

/** As categorias do posto e as globais, do tipo pedido ou "ambos". */
export function lerCategoriasDaApi(postoId: number, tipo: 'despesa' | 'receita'): ResultAsync<CategoriaDaApi[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/categorias-financeiras?tipo=${tipo}`, z.object({ data: z.array(categoriaDaApi) })).map((r) => r.data);
}
