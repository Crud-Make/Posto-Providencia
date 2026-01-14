// [14/01 15:52] Criação de tipos padronizados de resposta de API
export type SuccessResponse<T> = {
  data: T;
  success: true;
  timestamp: string;
};

export type ErrorResponse = {
  error: string;
  code: string;
  success: false;
  timestamp: string;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

