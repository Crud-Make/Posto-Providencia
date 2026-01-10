// [10/01 08:30] Hook para gerenciar métricas do dashboard
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { salesAnalysisService } from '../../../../services/api';
import { DashboardMetrics } from '../types';

interface UseDashboardMetricsResult {
    metrics: DashboardMetrics | null;
    loading: boolean;
    currentAnalysis: any | null; // Tipar melhor se possível, mas mantendo compatibilidade
    refreshMetrics: () => Promise<void>;
}

export const useDashboardMetrics = (): UseDashboardMetricsResult => {
    const { postoAtivoId } = usePosto();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentAnalysis, setCurrentAnalysis] = useState<any | null>(null);

    const loadMetrics = async () => {
        if (!postoAtivoId) return;

        try {
            setLoading(true);
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

            // 1. Fetch Current Month Sales Analysis
            const analysis = await salesAnalysisService.getMonthlyAnalysis(currentYear, currentMonth, postoAtivoId);
            setCurrentAnalysis(analysis);

            // 2. Fetch Previous Month for comparison
            const prevAnalysis = await salesAnalysisService.getMonthlyAnalysis(prevYear, prevMonth, postoAtivoId);

            // 3. Calculate projected revenue (based on daily average * remaining days)
            const daysPassed = today.getDate();
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            // Evita divisão por zero se for dia 1 de madrugada e não tiver vendas ainda, ou apenas proteção
            const dailyAverage = daysPassed > 0 ? analysis.totals.revenue / daysPassed : 0;
            const projectedRevenue = dailyAverage * daysInMonth;

            // 4. Calculate metrics
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
            console.error('Error loading dashboard metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, [postoAtivoId]);

    return { metrics, loading, currentAnalysis, refreshMetrics: loadMetrics };
};
