// [10/01 08:25] Extração de tipos do StrategicDashboard para reutilização
export interface DashboardMetrics {
    receitaProjetada: number;
    receitaMesAnterior: number;
    receitaVariacao: number;
    volumeVendas: number;
    volumeVariacao: number;
    margemMedia: number;
    margemVariacao: number;
    scoreEficiencia: number;
}

export interface DailyVolumeData {
    dia: string;
    diaSemana: string;
    volume: number;
    isToday: boolean;
    isProjection: boolean;
}

export interface AIInsight {
    id: string;
    type: 'opportunity' | 'alert' | 'performance' | 'stock';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
    timestamp: string;
    actionLabel?: string;
}

export interface StockAlert {
    combustivel: string;
    diasRestantes: number;
    percentual: number;
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
}

export interface AttendantPerformance {
    nome: string;
    vendaMedia: number;
    diferencaAcumulada: number;
    turnos: number;
}

export interface SalesByDayOfWeek {
    day: number;
    dayName: string;
    avgVolume: number;
    avgRevenue: number;
    count: number;
}

export interface AIPromotion {
    id: string;
    targetDay: string;
    targetProduct: string;
    currentAvg: number;
    bestDayAvg: number;
    potentialGain: number;
    discountSuggested: number;
    roiEstimate: number;
    confidence: number;
    templates: {
        id: string;
        name: string;
        description: string;
        match: number;
        icon: string;
    }[];
}
