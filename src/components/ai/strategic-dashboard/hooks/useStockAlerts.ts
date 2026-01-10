// [10/01 08:34] Hook para gerenciar alertas de estoque
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { estoqueService } from '../../../../services/api';
import { StockAlert } from '../types';

export const useStockAlerts = (currentAnalysis: any | null) => {
    const { postoAtivoId } = usePosto();
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

    useEffect(() => {
        const loadStockAlerts = async () => {
            if (!postoAtivoId || !currentAnalysis) return;

            try {
                const estoques = await estoqueService.getAll(postoAtivoId);
                const today = new Date();
                const daysPassed = today.getDate();
                
                // Estimate days remaining based on average daily consumption
                // Using volume from analysis
                const avgDailyConsumption = daysPassed > 0 && estoques.length > 0
                    ? currentAnalysis.totals.volume / daysPassed / estoques.length
                    : 0;

                const alerts: StockAlert[] = estoques.map((e: any) => {
                    const percentual = e.capacidade_tanque > 0 ? (e.quantidade_atual / e.capacidade_tanque) * 100 : 0;
                    let status: 'OK' | 'BAIXO' | 'CRÍTICO' = 'OK';
                    if (percentual < 10) status = 'CRÍTICO';
                    else if (percentual < 25) status = 'BAIXO';

                    const diasRestantes = avgDailyConsumption > 0 ? Math.floor(e.quantidade_atual / avgDailyConsumption) : 999;

                    return {
                        combustivel: e.combustivel?.nome || 'Desconhecido',
                        diasRestantes,
                        percentual,
                        status
                    };
                });
                setStockAlerts(alerts);
            } catch (error) {
                console.error('Error loading stock alerts:', error);
            }
        };

        loadStockAlerts();
    }, [postoAtivoId, currentAnalysis]);

    return { stockAlerts };
};
