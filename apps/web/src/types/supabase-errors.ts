/**
 * Tipos para tratamento de erros do Supabase
 * [13/01 08:22] Criado para eliminar uso de 'any' em error handling
 */

import { AuthError } from '@supabase/supabase-js';

/**
 * Tipo para erros do Postgrest (inline, sem import externo)
 */
interface PostgrestErrorLike {
    message: string;
    details: string;
    hint: string;
    code: string;
}

/**
 * Tipo unificado para erros do Supabase
 */
export type SupabaseError = AuthError | PostgrestErrorLike | null;

/**
 * Tipo para resposta de autenticação
 */
export interface AuthResponse {
    error: SupabaseError;
}

/**
 * Type guard para verificar se é um erro do Supabase
 */
export function isSupabaseError(error: unknown): error is PostgrestErrorLike | AuthError {
    return (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        ('code' in error || 'status' in error)
    );
}
