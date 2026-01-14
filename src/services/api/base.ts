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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withPostoFilter<T>(query: T, postoId?: number): T {
  if (postoId) {
    // Usando any/ts-ignore para evitar erro de "instanciação excessivamente profunda" do TS
    // com os tipos complexos do Supabase Query Builder
    // @ts-ignore
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
