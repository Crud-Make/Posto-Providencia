// [10/01 08:25] Extração de tipos do StrategicDashboard para reutilização
// [10/01 17:05] Adicionado JSDoc completo e tipos para substituir 'any'

/**
 * Métricas principais do dashboard estratégico
 * @interface DashboardMetrics
 */
export interface DashboardMetrics {
    /** Receita projetada para o mês atual */
    receitaProjetada: number;
    /** Receita do mês anterior para comparação */
    receitaMesAnterior: number;
    /** Variação percentual da receita */
    receitaVariacao: number;
    /** Volume total de vendas em litros */
    volumeVendas: number;
    /** Variação percentual do volume */
    volumeVariacao: number;
    /** Margem média de lucro em percentual */
    margemMedia: number;
    /** Variação da margem em percentual */
    margemVariacao: number;
    /** Score de eficiência operacional (0-10) */
    scoreEficiencia: number;
}

/**
 * Dados de volume diário para gráficos
 * @interface DailyVolumeData
 */
export interface DailyVolumeData {
    /** Data no formato DD/MM */
    dia: string;
    /** Nome do dia da semana */
    diaSemana: string;
    /** Volume vendido em litros */
    volume: number;
    /** Indica se é o dia atual */
    isToday: boolean;
    /** Indica se é uma projeção */
    isProjection: boolean;
}

/**
 * Insight gerado pela IA
 * @interface AIInsight
 */
export interface AIInsight {
    /** Identificador único do insight */
    id: string;
    /** Tipo de insight */
    type: 'opportunity' | 'alert' | 'performance' | 'stock';
    /** Título do insight */
    title: string;
    /** Mensagem detalhada */
    message: string;
    /** Nível de severidade */
    severity: 'info' | 'warning' | 'critical' | 'success';
    /** Timestamp de geração */
    timestamp: string;
    /** Label opcional para ação sugerida */
    actionLabel?: string;
}

/**
 * Alerta de estoque de combustível
 * @interface StockAlert
 */
export interface StockAlert {
    /** Nome do combustível */
    combustivel: string;
    /** Dias restantes até acabar o estoque */
    diasRestantes: number;
    /** Percentual restante do estoque */
    percentual: number;
    /** Status do estoque */
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
}

/**
 * Performance de um frentista
 * @interface AttendantPerformance
 */
export interface AttendantPerformance {
    /** Nome do frentista */
    nome: string;
    /** Média de vendas por turno */
    vendaMedia: number;
    /** Diferença acumulada (sobra/falta) */
    diferencaAcumulada: number;
    /** Número de turnos trabalhados */
    turnos: number;
}

/**
 * Vendas agregadas por dia da semana
 * @interface SalesByDayOfWeek
 */
export interface SalesByDayOfWeek {
    /** Número do dia (0-6, domingo-sábado) */
    day: number;
    /** Nome do dia da semana */
    dayName: string;
    /** Volume médio vendido */
    avgVolume: number;
    /** Receita média */
    avgRevenue: number;
    /** Quantidade de registros */
    count: number;
}

/**
 * Promoção sugerida pela IA
 * @interface AIPromotion
 */
export interface AIPromotion {
    /** Identificador único da promoção */
    id: string;
    /** Dia alvo da promoção */
    targetDay: string;
    /** Produto alvo */
    targetProduct: string;
    /** Média atual de vendas */
    currentAvg: number;
    /** Média do melhor dia */
    bestDayAvg: number;
    /** Ganho potencial estimado */
    potentialGain: number;
    /** Desconto sugerido em centavos */
    discountSuggested: number;
    /** Estimativa de ROI em percentual */
    roiEstimate: number;
    /** Confiança da IA (0-100) */
    confidence: number;
    /** Templates de promoção disponíveis */
    templates: TemplatePromocao[];
}

/**
 * Template de promoção
 * @interface TemplatePromocao
 */
export interface TemplatePromocao {
    /** Identificador do template */
    id: string;
    /** Nome do template */
    name: string;
    /** Descrição da estratégia */
    description: string;
    /** Percentual de match com a situação (0-100) */
    match: number;
    /** Ícone representativo */
    icon: string;
}

/**
 * Produto na análise de vendas
 * @interface ProdutoAnalise
 */
export interface ProdutoAnalise {
    /** Código do combustível */
    codigo: string;
    /** Nome do produto */
    nome: string;
    /** Margem de lucro */
    margin: number;
    /** Volume vendido */
    volume: number;
    /** Receita gerada */
    revenue: number;
}

/**
 * Fechamento de caixa
 * @interface Fechamento
 */
export interface Fechamento {
    /** ID do fechamento */
    id: string;
    /** Data do fechamento */
    data: string;
    /** Total de vendas */
    total_vendas: number;
    /** Volume total */
    volume_total?: number;
}

/**
 * Análise atual do sistema
 * @interface AnaliseAtual
 */
export interface AnaliseAtual {
    /** Produtos analisados */
    products: ProdutoAnalise[];
    /** Fechamentos do período */
    fechamentos?: Fechamento[];
    /** Data da análise */
    data?: string;
    /** Métricas calculadas */
    metrics?: DashboardMetrics;
}
