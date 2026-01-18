/**
 * Utilitários para criação de respostas padronizadas de API
 * @module @posto/api-core
 */

import type { ApiResponse, ApiError } from '@posto/types';

/**
 * Cria uma resposta de sucesso padronizada
 * @param data - Dados a serem retornados
 * @returns Objeto ApiResponse com sucesso
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
        success: true,
        data,
        error: null,
        timestamp: new Date().toISOString()
    };
}

/**
 * Cria uma resposta de erro padronizada
 * @param code - Código de erro
 * @param message - Mensagem de erro
 * @param details - Detalhes adicionais opcionais
 * @returns Objeto ApiResponse com erro
 */
export function createErrorResponse<T = never>(
    code: string,
    message: string,
    details?: Record<string, unknown>
): ApiResponse<T> {
    return {
        success: false,
        data: null,
        error: {
            code,
            message,
            details
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Type guard para verificar se uma resposta é de sucesso
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
    return response.success && response.data !== null;
}

/**
 * Type guard para verificar se uma resposta é de erro
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiError } {
    return !response.success && response.error !== null;
}
