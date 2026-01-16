/**
 * Response Types - Tipos padronizados para respostas de API
 * 
 * @remarks
 * Estabelece padrões consistentes para:
 * - Respostas de sucesso/erro
 * - Paginação
 * - Loading states
 * - Type guards para runtime safety
 * 
 * Isso garante que todas as respostas de API sejam tratadas de forma
 * consistente e type-safe em todo o sistema.
 * 
 * @example
 * ```typescript
 * // ✅ Resposta type-safe
 * const response: ApiResponse<Cliente[]> = await clienteService.getAll();
 * 
 * if (isSuccess(response)) {
 *   console.log(response.data); // ✅ TypeScript sabe que é Cliente[]
 * } else {
 *   console.error(response.error); // ✅ TypeScript sabe que é erro
 * }
 * 
 * // ✅ Criar respostas padronizadas
 * return createSuccessResponse(data, 'Operação concluída');
 * return createErrorResponse('Erro ao processar', 'VALIDATION_ERROR');
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 2.0.0
 * @since 2026-01-16
 */

// ============================================================================
// RESPOSTAS BÁSICAS
// ============================================================================

/**
 * Resposta de sucesso padronizada
 * 
 * @template T - Tipo dos dados retornados
 */
export interface SuccessResponse<T> {
  data: T;
  success: true;
  timestamp: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  success: false;
  timestamp: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function isSuccess<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

export function isError<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  state: LoadingState;
}

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    data,
    success: true,
    timestamp: new Date().toISOString(),
    message
  };
}

export function createErrorResponse(
  error: string,
  code = 'UNKNOWN_ERROR',
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error,
    code,
    success: false,
    timestamp: new Date().toISOString(),
    details
  };
}

