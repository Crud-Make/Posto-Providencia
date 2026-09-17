/**
 * Tipos relacionados ao Financeiro.
 */

/**
 * Registro de despesa operacional.
 */
export interface Despesa {
    id: string;
    descricao: string;
    categoria: string;
    valor: number;
    data: string;
    status: 'pendente' | 'pago';
    posto_id: number;
    data_pagamento?: string | null;
    observacoes?: string;
    categoria_id?: number | null;
}

