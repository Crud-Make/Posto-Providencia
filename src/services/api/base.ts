/**
 * Utilitários base para services da API
 */

import { supabase } from '../supabase';

/**
 * Aplica filtro de posto_id em uma query Supabase
 *
 * @param query - Query builder do Supabase
 * @param postoId - ID do posto (opcional)
 * @returns Query com filtro aplicado
 */
export function withPostoFilter<T extends { eq: (column: string, value: number) => T }>(
  query: T,
  postoId?: number
): T {
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
