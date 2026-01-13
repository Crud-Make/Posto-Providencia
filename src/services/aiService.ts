import { supabase } from './supabase';
import { Database } from '../types/database/index';

// Helper Types for direct usage
export type Posto = Database['public']['Tables']['Posto']['Row'];
export type Combustivel = Database['public']['Tables']['Combustivel']['Row'];
export type Fechamento = Database['public']['Tables']['Fechamento']['Row'];
export type Despesa = Database['public']['Tables']['Despesa']['Row'];
export type Estoque = Database['public']['Tables']['Estoque']['Row'];
export type Cliente = Database['public']['Tables']['Cliente']['Row'];
export type NotaFrentista = Database['public']['Tables']['NotaFrentista']['Row'];
export type FechamentoFrentista = Database['public']['Tables']['FechamentoFrentista']['Row'];
export type Frentista = Database['public']['Tables']['Frentista']['Row'];

// Types for AI Insights
export type InsightSeverity = 'info' | 'success' | 'warning' | 'critical';
export type InsightType = 'macro_vision' | 'promotion' | 'performance';

export interface AIInsight {
    id: string;
    type: InsightType;
    title: string;
    description: string;
    severity: InsightSeverity;
    action?: {
        label: string;
        handler: string; // identifier for UI to handle
    };
    metrics?: {
        label: string;
        value: string | number;
        trend?: 'up' | 'down' | 'neutral';
    }[];
}

export const aiService = {

    // ==========================================
    // 1. VISÃO 360º (MACRO & MICRO BUSINESS)
    // ==========================================
    async analyzeBusinessHealth(postoId: number): Promise<AIInsight[]> {
        const insights: AIInsight[] = [];
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        // Fetch Financial Data
        const { data: fechamentos } = await supabase
            .from('Fechamento')
            .select('total_vendas, total_recebido, diferenca, data')
            .eq('posto_id', postoId)
            .gte('data', startOfMonth)
            .lte('data', endOfMonth);

        const { data: despesas } = await supabase
            .from('Despesa')
            .select('valor, categoria')
            .eq('posto_id', postoId)
            .gte('data', startOfMonth)
            .lte('data', endOfMonth);

        const totalVendas = fechamentos?.reduce((acc, curr) => acc + curr.total_vendas, 0) || 0;
        const totalDespesas = despesas?.reduce((acc, curr) => acc + curr.valor, 0) || 0;
        const netProfit = totalVendas - totalDespesas; // Simplificado sem custo produto por enquanto

        // Macro Insight: Profitability
        if (totalVendas > 0) {
            const expenseRatio = (totalDespesas / totalVendas) * 100;

            if (expenseRatio > 15) {
                insights.push({
                    id: 'macro-expense-alert',
                    type: 'macro_vision',
                    title: 'Alerta de Rentabilidade',
                    description: `Suas despesas operacionais estão consumindo ${expenseRatio.toFixed(1)}% do faturamento este mês. O ideal é manter abaixo de 10-12%.`,
                    severity: 'warning',
                    metrics: [
                        { label: 'Faturamento', value: `R$ ${totalVendas.toLocaleString('pt-BR')}` },
                        { label: 'Despesas', value: `R$ ${totalDespesas.toLocaleString('pt-BR')}` }
                    ]
                });
            } else {
                insights.push({
                    id: 'macro-healthy',
                    type: 'macro_vision',
                    title: 'Saúde Financeira Estável',
                    description: 'Sua operação está saudável com balanço positivo entre receitas e despesas operacionais.',
                    severity: 'success',
                    metrics: [
                        { label: 'Saldo Operacional', value: `R$ ${netProfit.toLocaleString('pt-BR')}`, trend: 'up' }
                    ]
                });
            }
        }

        // Micro Insight: Cash Differences
        const totalDiferenca = fechamentos?.reduce((acc, curr) => acc + curr.diferenca, 0) || 0;
        if (totalDiferenca < -50) { // Tolerância de R$ 50
            insights.push({
                id: 'micro-cash-break',
                type: 'macro_vision',
                title: 'Quebra de Caixa Detectada',
                description: `Acumulado de diferenças de caixa negativo em R$ ${Math.abs(totalDiferenca).toFixed(2)}. Verifique os fechamentos recentes.`,
                severity: 'critical',
                action: { label: 'Ver Relatório', handler: 'view_reports' }
            });
        }

        return insights;
    },

    // ==========================================
    // 2. MOTOR DE PROMOÇÕES PREDITIVO
    // ==========================================
    async generatePromotionSuggestions(postoId: number): Promise<AIInsight[]> {
        // Analyze last 30 days of sales by Day of Week
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: salesHistory } = await supabase
            .from('Fechamento')
            .select('data, total_vendas, turno_id')
            .eq('posto_id', postoId)
            .gte('data', thirtyDaysAgo.toISOString());

        if (!salesHistory?.length) return [];

        // Group by Day of Week (0-6)
        const salesByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } as Record<number, number[]>;

        salesHistory.forEach(sale => {
            const day = new Date(sale.data).getDay();
            salesByDay[day].push(sale.total_vendas); // @ts-ignore
        });

        const avgByDay = Object.keys(salesByDay).map(day => {
            const values = salesByDay[Number(day)];
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            return { day: Number(day), avg };
        });

        // Find worst day
        const sortedDays = avgByDay.sort((a, b) => a.avg - b.avg);
        const worstDay = sortedDays[0];
        const bestDay = sortedDays[sortedDays.length - 1];

        const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const insights: AIInsight[] = [];

        // Suggest promo for worst day
        if (worstDay.avg < (bestDay.avg * 0.6)) { // If worst day is < 60% of best day
            insights.push({
                id: 'promo-low-traffic',
                type: 'promotion',
                title: `Oportunidade: ${daysMap[worstDay.day]} de Ofertas`,
                description: `Detectamos que ${daysMap[worstDay.day]} tem movimento 40% menor que o pico. Crie uma promoção relâmpago para atrair fluxo.`,
                severity: 'info',
                action: { label: 'Criar Promoção', handler: 'create_promo' },
                metrics: [
                    { label: 'Venda Média', value: `R$ ${worstDay.avg.toFixed(0)}` },
                    { label: 'Potencial', value: '+15%', trend: 'up' }
                ]
            });
        }

        return insights;
    },

    // ==========================================
    // 3. OTIMIZADOR DE PERFORMANCE OPERACIONAL
    // ==========================================
    async optimizePerformance(postoId: number): Promise<AIInsight[]> {
        // Analyze Attendant Performance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: performanceData } = await supabase
            .from('FechamentoFrentista')
            .select(`
        valor_total:valor_conferido, 
        diferenca:diferenca_calculada,
        frentista:Frentista(nome)
      `)
            .eq('posto_id', postoId);

        if (!performanceData?.length) return [];

        // Group by Frentista using a Map to handle potential null names safely
        const stats = new Map<string, { total: number; diff: number; count: number }>();

        type PerformanceItem = {
            valor_total?: number;
            diferenca?: number;
            frentista?: { nome: string } | null;
        };
        (performanceData as unknown as PerformanceItem[]).forEach((p) => {
            const name = p.frentista?.nome || 'Desconhecido';
            const current = stats.get(name) || { total: 0, diff: 0, count: 0 };

            stats.set(name, {
                total: current.total + (p.valor_total || 0),
                diff: current.diff + (p.diferenca || 0),
                count: current.count + 1
            });
        });

        const rankings = Array.from(stats.entries()).map(([name, data]) => ({
            name,
            avgSales: data.total / data.count,
            totalDiff: data.diff
        })).sort((a, b) => b.avgSales - a.avgSales);

        const topPerformer = rankings[0];
        // const bottomPerformer = rankings[rankings.length - 1]; // Unused

        const insights: AIInsight[] = [];

        // Recognize Top Performer
        if (topPerformer) {
            insights.push({
                id: 'perf-star',
                type: 'performance',
                title: `Destaque: ${topPerformer.name}`,
                description: `${topPerformer.name} tem o melhor desempenho de vendas do mês. Considere um bônus por meta atingida.`,
                severity: 'success',
                metrics: [
                    { label: 'Venda Média/Turno', value: `R$ ${topPerformer.avgSales.toFixed(0)}`, trend: 'up' }
                ]
            });
        }

        // Flag frequent cash differences
        const riskyAttendant = rankings.find(r => r.totalDiff < -20); // Cumulative diff < -20
        if (riskyAttendant) {
            insights.push({
                id: 'perf-risk',
                type: 'performance',
                title: `Atenção Operacional: ${riskyAttendant.name}`,
                description: `${riskyAttendant.name} apresenta diferenças de caixa consistentes. Necessária reciclagem de treinamento.`,
                severity: 'warning',
                metrics: [
                    { label: 'Diferença Acumulada', value: `R$ ${riskyAttendant.totalDiff.toFixed(2)}`, trend: 'down' }
                ]
            });
        }

        return insights;
    }
};
