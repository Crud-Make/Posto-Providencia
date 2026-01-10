/**
 * Tipos de UI para Dashboards
 *
 * @remarks
 * Tipos utilizados nos componentes de dashboard do sistema.
 * Inclui métricas, gráficos e visualizações.
 */

/**
 * Interface que representa os dados de combustível para dashboard e cards.
 */
export interface FuelData {
    name: string;
    volume: number;
    maxCapacity: number;
    color: string;
}

/**
 * Interface para as formas de pagamento exibidas em gráficos e seções.
 */
export interface PaymentMethod {
    name: string;
    percentage: number;
    value: number;
    color: string;
}

/**
 * Detalhes de um fechamento por frentista.
 */
export interface AttendantClosing {
    id: string;
    name: string;
    avatar: string;
    shift: string;
    totalSales: number;
    status: 'OK' | 'Divergente' | 'Aberto';
}

/**
 * Indicadores de performance de um frentista.
 */
export interface AttendantPerformance {
    id: string;
    name: string;
    avatar: string;
    metric: string;
    value: string;
    subValue: string;
    type: 'ticket' | 'volume' | 'divergence';
    status?: 'pendente' | 'conferido';
}

/**
 * Resumo de vendas por combustível.
 */
export interface FuelSummary {
    id: string;
    name: string;
    code: string; // GC, GA, ET, S10
    iconType: 'pump' | 'leaf' | 'truck';
    totalValue: number;
    volume: number;
    avgPrice: number;
    color: string;
    colorClass: string;
}

/**
 * Dados de um bico de combustível.
 */
export interface NozzleData {
    id: string;
    bico: number;
    productCode: string;
    productName: string;
    initialReading: number;
    finalReading: number;
    price: number;
    volume: number;
    total: number;
    status: 'OK' | 'Alert' | 'NoSales';
}

/**
 * Item do inventário de tanques/estoque.
 */
export interface InventoryItem {
    id: string;
    code: string;
    name: string;
    volume: number;
    capacity: number;
    percentage: number;
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
    daysRemaining: number;
    color: string;
    iconType: 'pump' | 'leaf' | 'truck';
    costPrice?: number;
    sellPrice?: number;
    previousStock?: number;
    purchases?: number;
    sales?: number;
}

/**
 * Alerta de inventário.
 */
export interface InventoryAlert {
    id: string;
    type: 'critical' | 'warning';
    title: string;
    message: string;
    actionPrimary: string;
    actionSecondary?: string;
}

/**
 * Transação de estoque (Venda/Compra).
 */
export interface InventoryTransaction {
    id: string;
    date: string;
    type: 'Venda' | 'Compra';
    product: string;
    quantity: number;
    responsible: string;
    status: 'Concluído' | 'Recebido';
}

/**
 * Rentabilidade por produto.
 */
export interface ProfitabilityItem {
    id: string;
    product: string;
    color: string;
    salesVolume: number;
    netMargin: number;
    totalProfit: number;
    sharePercentage: number;
    warning?: boolean;
}

/**
 * Recibos de fechamento agrupados por modalidade.
 */
export interface ClosingReceipts {
    credit: {
        sipag: number;
        azulzinha: number;
    };
    debit: {
        sipag: number;
        azulzinha: number;
    };
    pix: number;
    cash: number;
}
