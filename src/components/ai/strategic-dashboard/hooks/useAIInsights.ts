// [10/01 08:36] Hook para gerar insights de IA
import { useState, useEffect } from 'react';
import { AIInsight, StockAlert, DashboardMetrics } from '../types';

export const useAIInsights = (
    currentAnalysis: any | null,
    metrics: DashboardMetrics | null,
    stockAlerts: StockAlert[]
) => {
    const [insights, setInsights] = useState<AIInsight[]>([]);

    useEffect(() => {
        if (!currentAnalysis || !metrics) return;

        const generatedInsights: AIInsight[] = [];
        const today = new Date();

        // Check for low margin products
        if (currentAnalysis.products) {
            currentAnalysis.products.forEach((p: any) => {
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

        // Check for critical stock
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

        // Opportunity based on day of week analysis
        if (today.getDay() >= 4 && today.getDay() <= 6) { // Thu-Sat
            generatedInsights.push({
                id: 'weekend-opportunity',
                type: 'opportunity',
                title: 'Pico de Fim de Semana',
                message: 'Historicamente o fim de semana tem 20% mais movimento. Garanta equipe completa e estoque abastecido.',
                severity: 'info',
                timestamp: new Date().toISOString()
            });
        }

        // Revenue trending
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
