/**
 * Utilitários base para services da API
 */

import { supabase } from '../supabase';
// import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'; // Removido pois não é dependência direta

/**
 * Aplica filtro de posto_id em uma query Supabase
 *
 * @param query - Query builder do Supabase
 * @param postoId - ID do posto (opcional)
 * @returns Query com filtro aplicado
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withPostoFilter<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  postoId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (postoId) {
    return query.eq('posto_id', postoId);
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
