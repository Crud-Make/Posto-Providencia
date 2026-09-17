/**
 * Utilitários base para services da API
 */

import { supabase } from '../supabase';

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
