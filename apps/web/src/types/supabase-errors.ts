/**
 * Tipos para tratamento de erros do Supabase
 * [13/01 08:22] Criado para eliminar uso de 'any' em error handling
 */

import { AuthError } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/postgrest-js';

/**
 * Tipo unificado para erros do Supabase
 */
export type SupabaseError = AuthError | PostgrestError | null;

/**
 * Tipo para resposta de autenticação
 */
export interface AuthResponse {
    error: SupabaseError;
}

/**
 * Type guard para verificar se é um erro do Supabase
 */
export function isSupabaseError(error: unknown): error is PostgrestError | AuthError {
    return (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        ('code' in error || 'status' in error)
    );
}
