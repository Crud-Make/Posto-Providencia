/**
 * Tipos de contratos de API compartilhados
 * @module @posto/types/api
 */

/**
 * Interface para dados de submissão de fechamento mobile
 */
export interface SubmitClosingData {
    data: string;
    turno_id: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_nota: number;
    valor_pix: number;
    valor_dinheiro: number;
    valor_moedas: number;
    valor_encerrante: number;
    falta_caixa: number;
    observacoes: string;
    posto_id: number;
    frentista_id?: number;
    notas?: NotaFrentistaInput[];
}

/**
 * Interface para input de notas a prazo
 */
export interface NotaFrentistaInput {
    cliente_id: number;
    valor: number;
}

/**
 * Estrutura de resposta padronizada da API
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error: ApiError | null;
    timestamp: string;
}

/**
 * Estrutura de erro padronizada
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
