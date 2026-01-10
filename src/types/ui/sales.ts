/**
 * Tipos relacionados a Vendas e Análises.
 */

/**
 * Análise de vendas por produto.
 */
export interface SalesAnalysisProduct {
    id: string;
    name: string;
    code: string;
    colorClass: string;
    bicos: string;
    readings: {
        start: number;
        end: number;
    };
    volume: number;
    price: number;
    total: number;
    profit: number;
}

/**
 * Lucratividade por produto.
 */
export interface SalesProfitability {
    name: string;
    value: number;
    percentage: number;
    margin: number;
    color: string;
}

/**
 * Dados de evolução de vendas mensal.
 */
export interface SalesEvolutionData {
    month: string;
    volume: number;
    isCurrent?: boolean;
}

/**
 * Mix de produtos vendidos.
 */
export interface ProductMixData {
    name: string;
    volume: number;
    percentage: number;
    color: string;
}
