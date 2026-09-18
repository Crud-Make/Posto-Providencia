/**
 * Utilitários base para services da API
 */

import { errAsync, ResultAsync } from 'neverthrow';
import type { z } from 'zod';
import { supabase } from '../supabase';

/**
 * Por que uma leitura na API Laravel falhou. União discriminada: quem consome decide pela `tipo`,
 * nunca pela mensagem.
 */
export type ErroDaApi =
    | { readonly tipo: 'sem_api' }
    | { readonly tipo: 'rede'; readonly detalhe: string }
    | { readonly tipo: 'http'; readonly status: number }
    | { readonly tipo: 'formato'; readonly detalhe: string };

/**
 * Base da API Laravel, ou `null` quando o painel ainda lê do Supabase.
 *
 * @remarks
 * É a chave do strangler (Design Doc `painel-pela-api.md`, DECISÃO 1): cada service migrado
 * pergunta aqui antes de escolher a fonte. A Vercel não define `VITE_API_URL`, então a produção
 * continua no Supabase até o cutover (#105).
 */
export function urlDaApi(): string | null {
    const url = import.meta.env.VITE_API_URL;
    return typeof url === 'string' && url.trim() !== '' ? url.trim().replace(/\/+$/, '') : null;
}

/**
 * GET na API Laravel com a resposta validada por schema.
 *
 * @remarks
 * O `try/catch` do `fetch` vira `ResultAsync.fromPromise` aqui, na borda — regra de negócio acima
 * disto não lança. A resposta entra como `unknown` e só sai tipada depois do `safeParse`.
 */
export function buscarNaApi<T>(caminho: string, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    const base = urlDaApi();
    if (base === null) {
        return errAsync({ tipo: 'sem_api' });
    }

    return ResultAsync.fromPromise(
        fetch(`${base}${caminho}`, { headers: { Accept: 'application/json' } }),
        (erro): ErroDaApi => ({ tipo: 'rede', detalhe: erro instanceof Error ? erro.message : String(erro) }),
    )
        .andThen((resposta) =>
            resposta.ok
                ? ResultAsync.fromPromise(
                      resposta.json() as Promise<unknown>,
                      (erro): ErroDaApi => ({ tipo: 'formato', detalhe: erro instanceof Error ? erro.message : String(erro) }),
                  )
                : errAsync<unknown, ErroDaApi>({ tipo: 'http', status: resposta.status }),
        )
        .andThen((corpo) => {
            const lido = schema.safeParse(corpo);
            return lido.success
                ? ResultAsync.fromSafePromise(Promise.resolve(lido.data))
                : errAsync<T, ErroDaApi>({ tipo: 'formato', detalhe: lido.error.message });
        });
}

/** Mensagem para o `ApiResponse` legado, que só conhece texto. */
export function descreverErroDaApi(erro: ErroDaApi): string {
    switch (erro.tipo) {
        case 'sem_api':
            return 'VITE_API_URL não definida';
        case 'rede':
            return `API Laravel inacessível: ${erro.detalhe}`;
        case 'http':
            return `API Laravel respondeu ${erro.status}`;
        case 'formato':
            return `Resposta da API Laravel fora do contrato: ${erro.detalhe}`;
    }
}

/**
 * Contrato mínimo de query builder que sabe aplicar `.eq()` (satisfeito pelos builders do
 * Supabase).
 */
interface FilterableQuery {
    eq(column: string, value: unknown): FilterableQuery;
}

/**
 * Aplica filtro de posto_id em uma query Supabase
 *
 * @param query - Query builder do Supabase
 * @param postoId - ID do posto (opcional)
 * @returns Query com filtro aplicado
 *
 * @remarks
 * `T` é propositalmente **sem** constraint (`extends FilterableQuery`): o builder real do
 * Supabase tem um tipo genérico profundamente aninhado, e checar essa constraint contra ele em
 * cada call site estourava em "Type instantiation is excessively deep" (TS2589) nos services que
 * usam esta função. A chamada a `.eq()` é feita sobre uma view estrutural (`FilterableQuery`) do
 * mesmo valor, não sobre `T` — daí o cast de volta pro tipo concreto do chamador.
 */
export function withPostoFilter<T>(query: T, postoId?: number): T {
    if (postoId) {
        return (query as FilterableQuery).eq('posto_id', postoId) as T;
    }
    return query;
}

/**
 * Trata erro do Supabase e lança exceção padronizada
 */
export function handleSupabaseError(error: unknown, operacao: string): never {
    console.error(`[API] Erro em ${operacao}:`, error);
    throw error;
}

// Re-exporta supabase para uso interno
export { supabase };
