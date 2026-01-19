/**
 * Tipos padronizados para respostas de API
 * 
 * @remarks
 * Estabelece um contrato consistente entre o frontend e os serviços de API,
 * facilitando o tratamento de erros e estados de carregamento.
 */

/**
 * Resposta de sucesso contendo os dados solicitados
 * @template T - Tipo do dado retornado
 */
export type SuccessResponse<T> = {
  data: T;
  success: true;
  timestamp: string;
};

/**
 * Resposta de erro detalhada
 */
export type ErrorResponse = {
  error: string;
  code: string;
  success: false;
  timestamp: string;
};

/**
 * Tipo união para qualquer resposta da API
 * @template T - Tipo do dado em caso de sucesso
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard para verificar se uma resposta é de sucesso
 */
export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Resposta paginada padronizada
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

/**
 * Cria uma resposta de sucesso formatada
 * @param data - Dados a serem retornados
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    data,
    success: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Cria uma resposta de erro formatada
 * @param error - Mensagem de erro amigável
 * @param code - Código único para identificação do erro
 */
export function createErrorResponse(error: string, code = 'ERROR'): ErrorResponse {
  return {
    error,
    code,
    success: false,
    timestamp: new Date().toISOString()
  };
}



