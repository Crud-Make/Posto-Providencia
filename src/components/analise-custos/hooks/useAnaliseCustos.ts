import { useState, useEffect, useCallback } from 'react';
import { fetchProfitabilityData } from '../../../services/api';
import { usePosto } from '../../../contexts/PostoContext';
import { ProfitabilityItem, Margins } from '../types';

export const useAnaliseCustos = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProfitabilityItem[]>([]);
    const [margins, setMargins] = useState<Margins>({});
    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = useCallback(async (date: Date) => {
        try {
            setLoading(true);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const result = await fetchProfitabilityData(year, month, postoAtivoId);
            setData(result);

            // Inicializa margens simuladas com a margem bruta real
            const initialMargins: Margins = {};
            result.forEach((item: ProfitabilityItem) => {
                const currentMarginPercent = item.precoVenda > 0 ? (item.margemBrutaL / item.precoVenda) * 100 : 0;
                initialMargins[item.combustivelId] = Math.max(0, Math.round(currentMarginPercent * 10) / 10);
            });
            setMargins(initialMargins);
        } catch (error) {
            console.error("Erro ao carregar dados de lucratividade:", error);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);

    useEffect(() => {
        loadData(currentDate);
    }, [currentDate, loadData]);

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const exportToCSV = () => {
        if (!data.length) return;

        const headers = ["Produto", "Custo Médio", "Despesa/L", "Custo Total/L", "Preço Atual", "Volume (L)", "Receita", "Lucro Total", "Margem Líquida"];
        const rows = data.map(item => [
            item.nome,
            item.custoMedio.toFixed(2),
            item.despOperacional.toFixed(2),
            item.custoTotalL.toFixed(2),
            item.precoVenda.toFixed(2),
            item.volumeVendido.toFixed(0),
            item.receitaBruta.toFixed(2),
            item.lucroTotal.toFixed(2),
            item.margemLiquidaL.toFixed(2)
        ]);

        const content = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `analise-custo-${currentDate.toISOString().slice(0, 7)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleApplyPrices = async () => {
        alert("Funcionalidade de atualização de preços em massa está sendo integrada com o serviço de combustível.");
    };

    const calculatePrice = (cost: number, marginPercent: number) => {
        if (marginPercent >= 100) return cost * 10;
        return cost / (1 - (marginPercent / 100));
    };

    const calculateProfit = (suggestedPrice: number, costTotalL: number, volume: number) => {
        return (suggestedPrice - costTotalL) * volume;
    };

    return {
        loading,
        data,
        margins,
        setMargins,
        currentDate,
        handlePrevMonth,
        handleNextMonth,
        exportToCSV,
        handleApplyPrices,
        calculatePrice,
        calculateProfit
    };
};
