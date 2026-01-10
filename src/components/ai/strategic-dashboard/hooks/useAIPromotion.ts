// [10/01 08:40] Hook para gerar simulações de promoção com IA
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { fechamentoService } from '../../../../services/api';
import { AIPromotion, SalesByDayOfWeek } from '../types';

export const useAIPromotion = (currentAnalysis: any | null) => {
    const { postoAtivoId } = usePosto();
    const [aiPromotion, setAiPromotion] = useState<AIPromotion | null>(null);
    const [salesByDay, setSalesByDay] = useState<SalesByDayOfWeek[]>([]);

    useEffect(() => {
        const loadPromotionData = async () => {
            if (!postoAtivoId || !currentAnalysis) return;

            try {
                // 9. Generate AI Promotion Suggestions based on sales patterns
                // Analyze last 30 days of closings by day of week
                
                const salesByDayMap: Record<number, { volumes: number[], revenues: number[] }> = {
                    0: { volumes: [], revenues: [] }, 1: { volumes: [], revenues: [] },
                    2: { volumes: [], revenues: [] }, 3: { volumes: [], revenues: [] },
                    4: { volumes: [], revenues: [] }, 5: { volumes: [], revenues: [] },
                    6: { volumes: [], revenues: [] }
                };

                // Fetch last 30 days data
                // Note: ideally we should do a batch request, but following original logic loop
                // Optimizing: Use Promise.all if possible, but original code was sequential?
                // Original code: for (let d = 0; d < 30; d++) { await ... } 
                // This is slow. I will keep it sequential to match behavior/risk, but it's a candidate for optimization.
                // Actually, original code has `await` inside loop.
                
                for (let d = 0; d < 30; d++) {
                    const date = new Date();
                    date.setDate(date.getDate() - d);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayOfWeek = date.getDay();

                    try {
                        const fechamentos = await fechamentoService.getByDate(dateStr, postoAtivoId);
                        const dayRevenue = fechamentos.reduce((acc: number, f: any) => acc + (f.total_vendas || 0), 0);
                        if (dayRevenue > 0) {
                            salesByDayMap[dayOfWeek].revenues.push(dayRevenue);
                            salesByDayMap[dayOfWeek].volumes.push(dayRevenue / 5); // Rough estimate
                        }
                    } catch (e) {
                        // Skip days with no data
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

                // Find worst and best performing days
                const sortedDays = [...analyzedDays].filter(d => d.count > 0).sort((a, b) => a.avgRevenue - b.avgRevenue);
                const worstDay = sortedDays[0];
                const bestDay = sortedDays[sortedDays.length - 1];

                if (worstDay && bestDay && worstDay.avgRevenue < bestDay.avgRevenue * 0.7) {
                    // Worst day is at least 30% below best day - suggest promotion
                    const potentialGain = (bestDay.avgRevenue - worstDay.avgRevenue) * 0.3; // Conservative estimate
                    const discountAmount = 0.15; // R$ 0.15/L default
                    const estimatedExtraVolume = potentialGain / 5; // Rough calculation
                    const roi = potentialGain / (discountAmount * estimatedExtraVolume);

                    // Get best product for promotion
                    // Need currentAnalysis.products
                    const products = currentAnalysis.products || [];
                    const bestProduct = products.length > 0 
                        ? [...products].sort((a: any, b: any) => b.margin - a.margin)[0] 
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
                console.error('Error generating AI promotion:', error);
            }
        };

        loadPromotionData();
    }, [postoAtivoId, currentAnalysis]);

    return { aiPromotion, salesByDay };
};
