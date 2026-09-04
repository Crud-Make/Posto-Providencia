import { supabase } from './supabase';
import { lucroOperacionalDoMes } from './calculos-saude-financeira';

// Helper Types for direct usage
export type Combustivel = { preco_venda: number };
export type Despesa = { valor: number; categoria: string };
export type Estoque = { quantidade_atual: number };
export type NotaFrentista = { valor: number; status: string; data: string };
export type FechamentoFrentista = {
  valor_conferido: number | null;
  diferenca_calculada: number | null;
  frentista?: { nome: string } | null;
  posto_id: number;
};

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

        // [04/09/2026] Só dia APURADO entra na conta: `total_vendas`/`diferenca` nulos
        // são "sem encerrante completo", e somá-los como zero puxava a média para
        // baixo e afirmava que o caixa bateu num dia que ninguém conferiu.
        const apurados = (fechamentos ?? []).filter(f => f.total_vendas !== null && f.diferenca !== null);
        const totalVendas = apurados.reduce((acc, curr) => acc + Number(curr.total_vendas), 0);
        const totalDespesas = despesas?.reduce((acc, curr) => acc + curr.valor, 0) || 0;

        // [onda 3, grupo B] Lucro REAL do mês: lucro_bruto da RPC (custo da
        // época) − despesas do período — a mesma fórmula do painel do
        // proprietário. Antes era vendas − despesas, sem custo de produto:
        // >10× o lucro verdadeiro (golden calculos-saude-financeira).
        // Datas em string local (aaaa-mm-dd): toISOString() pulava de mês às 21h.
        const ano = today.getFullYear();
        const mesNum = today.getMonth() + 1;
        const mm = String(mesNum).padStart(2, '0');
        const { data: rpcLucro } = await supabase.rpc('get_dashboard_proprietario', {
            p_posto_id: postoId,
            p_data_inicio: `${ano}-${mm}-01`,
            p_data_fim: `${ano}-${mm}-${String(new Date(ano, mesNum, 0).getDate()).padStart(2, '0')}`,
        });
        const lucroBruto = Number(rpcLucro?.[0]?.lucro_bruto ?? 0);
        const netProfit = lucroOperacionalDoMes(lucroBruto, totalDespesas);

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
                    description: 'Sua operação está saudável: o lucro do mês (receita − custo do produto − despesas) está positivo.',
                    severity: 'success',
                    metrics: [
                        { label: 'Lucro do Mês', value: `R$ ${netProfit.toLocaleString('pt-BR')}`, trend: 'up' }
                    ]
                });
            }
        }

        // Micro Insight: Cash Differences
        const totalDiferenca = apurados.reduce((acc, curr) => acc + Number(curr.diferenca), 0);
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
            // Dia não apurado (venda nula) fica fora da média — não é venda zero.
            if (sale.total_vendas === null) return;
            const day = new Date(sale.data).getDay();
            salesByDay[day].push(Number(sale.total_vendas));
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
        (performanceData || []).forEach((p: PerformanceItem) => {
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
