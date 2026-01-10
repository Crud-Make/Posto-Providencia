// [10/01 08:34] Hook para gerenciar alertas de estoque
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { estoqueService } from '../../../../services/api';
import { StockAlert } from '../types';

/**
 * Resultado do hook useAlertasEstoque
 */
interface UseAlertasEstoqueResult {
    /** Lista de alertas de estoque gerados */
    stockAlerts: StockAlert[];
}

/**
 * Hook responsável por monitorar o nível dos tanques e gerar alertas de estoque baixo ou crítico.
 * Calcula também a previsão de duração do estoque com base no consumo médio.
 * 
 * @param {any} currentAnalysis Análise de vendas atual para cálculo de consumo
 * @returns {UseAlertasEstoqueResult} Objeto contendo a lista de alertas
 */
export const useAlertasEstoque = (currentAnalysis: any | null): UseAlertasEstoqueResult => {
    const { postoAtivoId } = usePosto();
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

    useEffect(() => {
        const loadStockAlerts = async () => {
            if (!postoAtivoId || !currentAnalysis) return;

            try {
                const estoques = await estoqueService.getAll(postoAtivoId);
                const today = new Date();
                const daysPassed = today.getDate();
                
                // Estimar dias restantes com base no consumo médio diário
                // Usando volume da análise
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
                console.error('Erro ao carregar alertas de estoque:', error);
            }
        };

        loadStockAlerts();
    }, [postoAtivoId, currentAnalysis]);

    return { stockAlerts };
};
