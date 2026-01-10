// [10/01 08:35] Hook para gerar insights de IA
// [10/01 17:10] Substituído 'any' por tipos estritos
import { useState, useEffect } from 'react';
import { SalesAnalysisData } from '../../../../services/api/salesAnalysis.service';
import { AIInsight, DashboardMetrics, StockAlert } from '../types';

/**
 * Resultado do hook useInsightsIA
 */
interface UseInsightsIAResult {
    /** Lista de insights gerados pela IA */
    insights: AIInsight[];
}

/**
 * Hook responsável por gerar insights inteligentes com base nas métricas, estoque e análise de vendas.
 * Identifica produtos com margem baixa, estoque crítico, oportunidades de venda e tendências de receita.
 * 
 * @param {any} currentAnalysis Análise de vendas atual
 * @param {DashboardMetrics | null} metrics Métricas do dashboard
 * @param {StockAlert[]} stockAlerts Alertas de estoque atuais
 * @returns {UseInsightsIAResult} Objeto contendo a lista de insights
 */
export const useInsightsIA = (
    currentAnalysis: SalesAnalysisData | null,
    metrics: DashboardMetrics | null,
    stockAlerts: StockAlert[]
): UseInsightsIAResult => {
    const [insights, setInsights] = useState<AIInsight[]>([]);

    useEffect(() => {
        if (!currentAnalysis || !metrics) return;

        const generatedInsights: AIInsight[] = [];
        const today = new Date();

        // Verificar produtos com baixa margem
        if (currentAnalysis.products) {
            currentAnalysis.products.forEach((p) => {
                if (p.margin < 5 && p.volume > 100) {
                    generatedInsights.push({
                        id: `margin-${p.code}`,
                        type: 'alert',
                        title: `Margem Baixa: ${p.name}`,
                        message: `A margem de ${p.name} está em apenas ${p.margin.toFixed(1)}%. Considere ajustar o preço de venda.`,
                        severity: 'warning',
                        timestamp: new Date().toISOString(),
                        actionLabel: 'Ver Preços'
                    });
                }
            });
        }

        // Verificar estoque crítico
        stockAlerts.forEach(a => {
            if (a.status === 'CRÍTICO') {
                generatedInsights.push({
                    id: `stock-${a.combustivel}`,
                    type: 'stock',
                    title: `Estoque Crítico: ${a.combustivel}`,
                    message: `${a.combustivel} está com apenas ${a.percentual.toFixed(0)}% de capacidade. Previsão de ${a.diasRestantes} dias restantes.`,
                    severity: 'critical',
                    timestamp: new Date().toISOString(),
                    actionLabel: 'Agendar Compra'
                });
            }
        });

        // Oportunidade baseada na análise do dia da semana
        if (today.getDay() >= 4 && today.getDay() <= 6) { // Qui-Sab
            generatedInsights.push({
                id: 'weekend-opportunity',
                type: 'opportunity',
                title: 'Pico de Fim de Semana',
                message: 'Historicamente o fim de semana tem 20% mais movimento. Garanta equipe completa e estoque abastecido.',
                severity: 'info',
                timestamp: new Date().toISOString()
            });
        }

        // Tendência de receita
        const { receitaVariacao } = metrics;
        if (receitaVariacao > 10) {
            generatedInsights.push({
                id: 'revenue-up',
                type: 'performance',
                title: 'Receita em Alta',
                message: `Sua receita projetada está ${receitaVariacao.toFixed(1)}% acima do mês anterior. Continue assim!`,
                severity: 'success',
                timestamp: new Date().toISOString()
            });
        } else if (receitaVariacao < -10) {
            generatedInsights.push({
                id: 'revenue-down',
                type: 'alert',
                title: 'Queda na Receita',
                message: `A receita projetada está ${Math.abs(receitaVariacao).toFixed(1)}% abaixo do mês anterior. Analise as causas.`,
                severity: 'warning',
                timestamp: new Date().toISOString(),
                actionLabel: 'Ver Relatório'
            });
        }

        setInsights(generatedInsights);
    }, [currentAnalysis, metrics, stockAlerts]);

    return { insights };
};
