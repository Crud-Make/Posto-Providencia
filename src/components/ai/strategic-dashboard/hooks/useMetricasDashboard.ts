// [10/01 08:30] Hook para gerenciar métricas do dashboard
// [10/01 17:06] Substituído 'any' por 'SalesAnalysisData' para TypeScript estrito
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { salesAnalysisService } from '../../../../services/api';
import { SalesAnalysisData } from '../../../../services/api/salesAnalysis.service';
import { DashboardMetrics } from '../types';

/**
 * Resultado do hook useMetricasDashboard
 */
interface UseMetricasDashboardResult {
    /** Métricas calculadas do dashboard */
    metrics: DashboardMetrics | null;
    /** Estado de carregamento */
    loading: boolean;
    /** Dados brutos da análise atual */
    currentAnalysis: SalesAnalysisData | null;
    /** Função para recarregar as métricas */
    refreshMetrics: () => Promise<void>;
}

/**
 * Hook responsável por buscar e calcular as métricas principais do dashboard estratégico.
 * Compara o mês atual com o mês anterior para gerar variações de receita, volume e margem.
 * 
 * @returns {UseMetricasDashboardResult} Objeto contendo métricas, estado de loading e função de refresh
 */
export const useMetricasDashboard = (): UseMetricasDashboardResult => {
    const { postoAtivoId } = usePosto();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentAnalysis, setCurrentAnalysis] = useState<SalesAnalysisData | null>(null);

    /**
     * Carrega as métricas de vendas do posto ativo
     */
    const loadMetrics = async () => {
        if (!postoAtivoId) return;

        try {
            setLoading(true);
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

            // 1. Buscar Análise de Vendas do Mês Atual
            const analysis = await salesAnalysisService.getMonthlyAnalysis(currentYear, currentMonth, postoAtivoId);
            setCurrentAnalysis(analysis);

            // 2. Buscar Mês Anterior para comparação
            const prevAnalysis = await salesAnalysisService.getMonthlyAnalysis(prevYear, prevMonth, postoAtivoId);

            // 3. Calcular receita projetada (média diária * dias restantes)
            const daysPassed = today.getDate();
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            // Evita divisão por zero se for dia 1 de madrugada e não tiver vendas ainda, ou apenas proteção
            const dailyAverage = daysPassed > 0 ? analysis.totals.revenue / daysPassed : 0;
            const projectedRevenue = dailyAverage * daysInMonth;

            // 4. Calcular métricas
            const revenueVariation = prevAnalysis.totals.revenue > 0
                ? ((projectedRevenue - prevAnalysis.totals.revenue) / prevAnalysis.totals.revenue) * 100
                : 0;

            const volumeVariation = prevAnalysis.totals.volume > 0
                ? ((analysis.totals.volume - prevAnalysis.totals.volume) / prevAnalysis.totals.volume) * 100
                : 0;

            const marginVariation = prevAnalysis.totals.avgMargin > 0
                ? analysis.totals.avgMargin - prevAnalysis.totals.avgMargin
                : 0;

            setMetrics({
                receitaProjetada: projectedRevenue,
                receitaMesAnterior: prevAnalysis.totals.revenue,
                receitaVariacao: revenueVariation,
                volumeVendas: analysis.totals.volume,
                volumeVariacao: volumeVariation,
                margemMedia: analysis.totals.avgMargin,
                margemVariacao: marginVariation,
                scoreEficiencia: Math.min(10, Math.max(0, 7 + (analysis.totals.avgMargin / 10)))
            });

        } catch (error) {
            console.error('Erro ao carregar métricas do dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, [postoAtivoId]);

    return { metrics, loading, currentAnalysis, refreshMetrics: loadMetrics };
};
