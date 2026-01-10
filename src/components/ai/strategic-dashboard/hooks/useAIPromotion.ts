// [10/01 08:40] Hook para gerar simulações de promoção com IA
// [10/01 17:09] Substituído 'any' por tipos estritos
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { fechamentoService } from '../../../../services/api';
import { SalesAnalysisData } from '../../../../services/api/salesAnalysis.service';
import { AIPromotion, SalesByDayOfWeek } from '../types';

/**
 * Resultado do hook useAIPromotion
 */
interface UseAIPromotionResult {
    /** Sugestão de promoção gerada pela IA */
    aiPromotion: AIPromotion | null;
    /** Análise de vendas por dia da semana */
    salesByDay: SalesByDayOfWeek[];
}

/**
 * Hook responsável por simular e sugerir promoções baseadas no histórico de vendas.
 * Analisa os dias da semana com pior desempenho e sugere ações para aumentar o volume.
 * 
 * @param {SalesAnalysisData | null} currentAnalysis Análise de vendas atual
 * @returns {UseAIPromotionResult} Objeto contendo a sugestão de promoção e análise diária
 */
export const useAIPromotion = (currentAnalysis: SalesAnalysisData | null): UseAIPromotionResult => {
    const { postoAtivoId } = usePosto();
    const [aiPromotion, setAiPromotion] = useState<AIPromotion | null>(null);
    const [salesByDay, setSalesByDay] = useState<SalesByDayOfWeek[]>([]);

    useEffect(() => {
        const loadPromotionData = async () => {
            if (!postoAtivoId || !currentAnalysis) return;

            try {
                // 9. Gerar sugestões de promoção de IA com base nos padrões de vendas
                // Analisar fechamentos dos últimos 30 dias por dia da semana

                const salesByDayMap: Record<number, { volumes: number[], revenues: number[] }> = {
                    0: { volumes: [], revenues: [] }, 1: { volumes: [], revenues: [] },
                    2: { volumes: [], revenues: [] }, 3: { volumes: [], revenues: [] },
                    4: { volumes: [], revenues: [] }, 5: { volumes: [], revenues: [] },
                    6: { volumes: [], revenues: [] }
                };

                // Buscar dados dos últimos 30 dias
                // Nota: idealmente deveríamos fazer uma requisição em lote, mas seguindo o loop lógico original
                // Otimização: Usar Promise.all se possível, mas código original era sequencial?
                // Código original: for (let d = 0; d < 30; d++) { await ... } 
                // Isso é lento. Manterei sequencial para manter comportamento/risco, mas é candidato a otimização.
                // Na verdade, o código original tem await dentro do loop.

                for (let d = 0; d < 30; d++) {
                    const date = new Date();
                    date.setDate(date.getDate() - d);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayOfWeek = date.getDay();

                    try {
                        const fechamentos = await fechamentoService.getByDate(dateStr, postoAtivoId);
                        const dayRevenue = fechamentos.reduce((acc: number, f) => acc + (f.total_vendas || 0), 0);
                        if (dayRevenue > 0) {
                            salesByDayMap[dayOfWeek].revenues.push(dayRevenue);
                            salesByDayMap[dayOfWeek].volumes.push(dayRevenue / 5); // Estimativa aproximada
                        }
                    } catch (e) {
                        // Pular dias sem dados
                    }
                }

                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const analyzedDays: SalesByDayOfWeek[] = Object.entries(salesByDayMap).map(([day, data]) => ({
                    day: parseInt(day),
                    dayName: dayNames[parseInt(day)],
                    avgVolume: data.volumes.length > 0 ? data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length : 0,
                    avgRevenue: data.revenues.length > 0 ? data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length : 0,
                    count: data.revenues.length
                }));

                setSalesByDay(analyzedDays);

                // Encontrar dias de pior e melhor desempenho
                const sortedDays = [...analyzedDays].filter(d => d.count > 0).sort((a, b) => a.avgRevenue - b.avgRevenue);
                const worstDay = sortedDays[0];
                const bestDay = sortedDays[sortedDays.length - 1];

                if (worstDay && bestDay && worstDay.avgRevenue < bestDay.avgRevenue * 0.7) {
                    // Pior dia está pelo menos 30% abaixo do melhor dia - sugerir promoção
                    const potentialGain = (bestDay.avgRevenue - worstDay.avgRevenue) * 0.3; // Estimativa conservadora
                    const discountAmount = 0.15; // R$ 0.15/L padrão
                    const estimatedExtraVolume = potentialGain / 5; // Cálculo aproximado
                    const roi = potentialGain / (discountAmount * estimatedExtraVolume);

                    // Obter melhor produto para promoção
                    // Necessita currentAnalysis.products
                    const products = currentAnalysis.products || [];
                    const bestProduct = products.length > 0
                        ? [...products].sort((a, b) => b.margin - a.margin)[0]
                        : null;

                    setAiPromotion({
                        id: 'promo-weak-day',
                        targetDay: worstDay.dayName,
                        targetProduct: bestProduct?.name || 'Etanol',
                        currentAvg: worstDay.avgRevenue,
                        bestDayAvg: bestDay.avgRevenue,
                        potentialGain: potentialGain,
                        discountSuggested: 15, // centavos
                        roiEstimate: Math.min(5, Math.max(1, roi)),
                        confidence: Math.min(95, 60 + (analyzedDays.filter(d => d.count >= 3).length * 5)),
                        templates: [
                            {
                                id: 'flash',
                                name: 'Flash Weekend',
                                description: `Desconto relâmpago às ${worstDay.dayName}s 14h-18h`,
                                match: 92,
                                icon: 'bolt'
                            },
                            {
                                id: 'fidelity',
                                name: 'Fidelidade+',
                                description: 'Pontos em dobro para clientes cadastrados',
                                match: 78,
                                icon: 'loyalty'
                            },
                            {
                                id: 'combo',
                                name: 'Combo Café',
                                description: 'Abasteça 30L+ e ganhe café grátis',
                                match: 65,
                                icon: 'local_cafe'
                            }
                        ]
                    });
                } else {
                    setAiPromotion(null);
                }

            } catch (error) {
                console.error('Erro ao gerar promoção de IA:', error);
            }
        };

        loadPromotionData();
    }, [postoAtivoId, currentAnalysis]);

    return { aiPromotion, salesByDay };
};
