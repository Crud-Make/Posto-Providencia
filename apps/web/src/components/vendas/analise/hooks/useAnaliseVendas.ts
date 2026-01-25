import { useState, useEffect, useMemo, useCallback } from 'react';
import { salesAnalysisService } from '../../../../services/api';
import { usePosto } from '../../../../contexts/PostoContext';
import { ProductData, ProfitabilityData, Totals, PeriodData, Insight } from '../types';
import { isSuccess } from '../../../../types/ui/response-types';

export const useAnaliseVendas = () => {
  const { postoAtivoId } = usePosto();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [products, setProducts] = useState<ProductData[]>([]);
  const [profitability, setProfitability] = useState<ProfitabilityData[]>([]);
  const [totals, setTotals] = useState<Totals>({
    volume: 0,
    revenue: 0,
    profit: 0,
    avgMargin: 0,
    avgProfitPerLiter: 0
  });
  const [previousPeriod, setPreviousPeriod] = useState<PeriodData | null>(null);

  // Date selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const loadData = useCallback(async () => {
    if (!postoAtivoId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await salesAnalysisService.getMonthlyAnalysis(selectedYear, selectedMonth, postoAtivoId);

      if (!isSuccess(response)) {
        setError(response.error);
        setLoading(false);
        return;
      }

      const data = response.data;
      setProducts(data.products);
      setProfitability(data.profitability);
      setTotals(data.totals);
      setPreviousPeriod(data.previousPeriod || null);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados de análise. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, postoAtivoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate variations
  const variations = useMemo(() => {
    if (!previousPeriod || previousPeriod.volume === 0) {
      return { volume: 0, revenue: 0, profit: 0 };
    }
    return {
      volume: previousPeriod.volume > 0 ? ((totals.volume - previousPeriod.volume) / previousPeriod.volume) * 100 : 0,
      revenue: previousPeriod.revenue > 0 ? ((totals.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100 : 0,
      profit: previousPeriod.profit > 0 ? ((totals.profit - previousPeriod.profit) / previousPeriod.profit) * 100 : 0,
    };
  }, [totals, previousPeriod]);

  // Generate insights based on data
  const insights = useMemo(() => {
    const result: Insight[] = [];

    if (products.length === 0) {
      result.push({
        type: 'info',
        title: 'Análise Inicial',
        message: 'O sistema está aguardando mais dados para gerar recomendações precisas sobre margens e performance.'
      });
      return result;
    }

    // Find best and worst products
    const sortedByProfit = [...products].sort((a, b) => b.profit - a.profit);

    if (sortedByProfit.length > 0) {
      const best = sortedByProfit[0];
      const percentage = totals.profit > 0 ? (best.profit / totals.profit * 100).toFixed(1) : '0';
      result.push({
        type: 'success',
        title: `Produto mais lucrativo: ${best.name}`,
        message: `Representa ${percentage}% do lucro total do período.`
      });
    }

    // Low margin alert
    const lowMarginProducts = products.filter(p => p.margin < 10 && p.margin > 0);
    if (lowMarginProducts.length > 0) {
      const product = lowMarginProducts[0];
      result.push({
        type: 'warning',
        title: `${product.name} com margem baixa (${product.margin.toFixed(2)}%)`,
        message: `Considere ajustar o preço de R$ ${product.price.toFixed(2)} para atingir margem de 10%.`
      });
    }

    // Volume leader
    const sortedByVolume = [...products].sort((a, b) => b.volume - a.volume);
    if (sortedByVolume.length > 0) {
      const leader = sortedByVolume[0];
      const volumeShare = totals.volume > 0 ? (leader.volume / totals.volume * 100).toFixed(1) : '0';
      result.push({
        type: 'info',
        title: `${leader.name}: ${volumeShare}% das vendas em litros`,
        message: 'Principal produto do posto em volume.'
      });
    }

    return result;
  }, [products, totals]);

  return {
    loading,
    error,
    products,
    profitability,
    totals,
    variations,
    insights,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    loadData
  };
};
