// [09/01 19:54] Criado para organizar tipos de UI e interface que estavam na raiz
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

/**
 * Frentista vinculado a um fechamento.
 */
export interface ClosingAttendant {
    id: string;
    name: string;
    avatar: string;
    shift: string;
    expectedValue: number;
    declared: {
        card: number;
        note: number;
        pix: number;
        cash: number;
    };
    observation?: string;
    hasHistory?: boolean;
}

/**
 * Leitura individual de um bico.
 */
export interface ReadingNozzle {
    id: string;
    number: string;
    product: string;
    productColorClass: string;
    tank: string;
    initialReading: number;
    price: number;
}

/**
 * Bomba de combustível contendo seus bicos.
 */
export interface ReadingPump {
    id: string;
    name: string;
    nozzles: ReadingNozzle[];
}

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

/**
 * Perfil completo de um frentista para gestão.
 */
export interface AttendantProfile {
    id: string;
    name: string;
    initials: string;
    phone: string;
    shift: string;
    status: 'Ativo' | 'Inativo';
    admissionDate: string;
    sinceDate: string;
    cpf: string;
    divergenceRate: number;
    riskLevel: 'Baixo Risco' | 'Médio Risco' | 'Alto Risco';
    avatarColorClass: string;
    email: string;
    posto_id: number;
}

/**
 * Entrada do histórico de fechamento de um frentista.
 */
export interface AttendantHistoryEntry {
    id: string;
    date: string;
    shift: string;
    value: number;
    status: 'OK' | 'Divergente';
}

/**
 * Configuração de produto (combustível).
 */
export interface ProductConfig {
    id: string;
    name: string;
    type: 'Combustível' | 'Biocombustível' | 'Diesel';
    price: number;
}

/**
 * Configuração de bico no sistema.
 */
export interface NozzleConfig {
    id: string;
    number: string;
    productName: string;
    tankSource: string;
}

/**
 * Configuração das taxas e tipos de pagamento.
 */
export interface PaymentMethodConfig {
    id: string;
    name: string;
    type: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';
    tax: number;
    active: boolean;
}

/**
 * Resposta de autenticação mobile.
 */
export interface MobileAuthResponse {
    token: string;
    user: {
        id: string;
        name: string;
        role: 'admin' | 'manager' | 'attendant';
        avatar: string;
    };
}

/**
 * Notificação push para o app mobile.
 */
export interface MobileNotification {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    read: boolean;
    type: 'alert' | 'info' | 'success';
}

/**
 * Dados da home do app mobile.
 */
export interface MobileHomeData {
    totalSalesToday: number;
    pendingClosings: number;
    alertsCount: number;
    recentNotifications: MobileNotification[];
    quickStats: {
        label: string;
        value: string;
        trend: 'up' | 'down' | 'neutral';
    }[];
}

/**
 * Representa um empréstimo ou financiamento.
 */
export interface Loan {
    id: string;
    credor: string;
    valorTotal: number;
    quantidadeParcelas: number;
    valorParcela: number;
    dataEmprestimo: string;
    dataPrimeiroVencimento: string;
    periodicidade: 'mensal' | 'quinzenal' | 'semanal' | 'diario';
    taxaJuros?: number;
    observacoes?: string;
    ativo: boolean;
    parcelas?: LoanInstallment[];
}

/**
 * Parcela individual de um empréstimo.
 */
export interface LoanInstallment {
    id: string;
    emprestimoId: string;
    numeroParcela: number;
    dataVencimento: string;
    valor: number;
    dataPagamento?: string | null;
    status: 'pendente' | 'pago' | 'atrasado';
    jurosMulta?: number;
}

/**
 * Registro de dívida ativa do posto.
 */
export interface Divida {
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status: 'pendente' | 'pago';
    posto_id: number;
}

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
}

/**
 * Status de solvência para vencimentos próximos.
 */
export interface SolvencyStatus {
    dividaId: string;
    descricao: string;
    valor: number;
    dataVencimento: string;
    status: 'verde' | 'amarelo' | 'vermelho';
    mensagem: string;
    deficitProjetado?: number;
    diasAteVencimento: number;
    coberturaPorcentagem: number;
}

/**
 * Projeção de solvência e fluxo de caixa.
 */
export interface SolvencyProjection {
    saldoAtual: number;
    mediaDiaria: number;
    proximasParcelas: SolvencyStatus[];
    metaVendas?: {
        totalCompromissos: number;
        litrosNecessarios: number;
        margemPorLitro: number;
        litrosVendidosMes: number;
        lucroGeradoMes: number;
        progressoPorcentagem: number;
        valorRestante: number;
    };
}
