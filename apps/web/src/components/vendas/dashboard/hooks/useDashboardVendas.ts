import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../../contexts/usePosto';
import { usePeriodo } from '../../../../contexts/usePeriodo';
import { leituraService, estoqueService } from '../../../../services/api';
import { SalesSummary, MonthlyData, ProductMixItem } from '../types';
import { Combustivel } from '../../../../types/database/index';
import { isSuccess } from '../../../../types/ui/response-types';
import { paraIsoLocal, serieVendaMensal } from '@posto/utils';
import { lucroEstimadoDashboard } from './calculos-dashboard-vendas';

// Color mapping for fuels
const FUEL_COLORS: Record<string, string> = {
  'GC': 'bg-red-500',
  'GA': 'bg-blue-500',
  'ET': 'bg-green-500',
  'S10': 'bg-yellow-500',
  'DIESEL': 'bg-amber-500',
};

export const useDashboardVendas = () => {
  const { postoAtivoId } = usePosto();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // O mês vem do contexto: é o mesmo período das demais telas de análise.
  const { mes: selectedMonth, definirMes: setSelectedMonth } = usePeriodo();

  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalLitros: 0,
    totalVendas: 0,
    porCombustivel: []
  });

  const [monthlyEvolution, setMonthlyEvolution] = useState<MonthlyData[]>([]);
  const [productMix, setProductMix] = useState<ProductMixItem[]>([]);
  const [averageMargin, setAverageMargin] = useState<number>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!postoAtivoId) return;

    try {
      setLoading(true);
      setError(null);

      // Janela de 6 meses terminando no mês selecionado: uma busca só serve o
      // resumo do mês e o gráfico de evolução — toda barra vem de Leitura real.
      const [year, month] = selectedMonth.split('-').map(Number);
      const startJanela = new Date(year, month - 6, 1);
      const endDate = new Date(year, month, 0);

      const resLeituras = await leituraService.getByDateRange(
        paraIsoLocal(startJanela),
        paraIsoLocal(endDate),
        postoAtivoId
      );

      const leiturasJanela = isSuccess(resLeituras) ? resLeituras.data : [];
      // `data` é string ISO — recortar, nunca converter para Date (UTC escorrega um dia).
      const allLeituras = leiturasJanela.filter(l => l.data.slice(0, 7) === selectedMonth);

      // Calculate totals
      const totalLitros = allLeituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
      const totalVendas = allLeituras.reduce((acc, l) => acc + (l.valor_total || 0), 0);

      // Group by combustivel
      const byCombustivel = allLeituras.reduce((acc, l) => {
        const codigo = l.bico.combustivel.codigo;
        if (!acc[codigo]) {
          acc[codigo] = {
            combustivel: l.bico.combustivel,
            litros: 0,
            valor: 0,
          };
        }
        acc[codigo].litros += l.litros_vendidos || 0;
        acc[codigo].valor += l.valor_total || 0;
        return acc;
      }, {} as Record<string, { combustivel: Combustivel; litros: number; valor: number }>);

      setSalesSummary({
        totalLitros,
        totalVendas,
        porCombustivel: Object.values(byCombustivel)
      });

      // Calculate product mix
      const mixData: ProductMixItem[] = Object.values(byCombustivel).map(item => ({
        name: item.combustivel.nome,
        codigo: item.combustivel.codigo,
        volume: item.litros,
        percentage: totalLitros > 0 ? (item.litros / totalLitros) * 100 : 0,
        color: FUEL_COLORS[item.combustivel.codigo] || 'bg-gray-500',
      }));
      setProductMix(mixData);

      // Calculate estimated profit (using a simple margin estimate)
      // In a real app, this would come from cost data
      const resEstoque = await estoqueService.getAll(postoAtivoId);
      const estoquesData = isSuccess(resEstoque) ? resEstoque.data : [];

      // Conta legada (sem despesa operacional, custo do carimbo) — fórmula em
      // ./calculos-dashboard-vendas, exercitada pelo golden ao lado (onda 2.2).
      const { profit, margin } = lucroEstimadoDashboard(
        Object.values(byCombustivel).map(item => {
          const estoque = estoquesData.find(e => e.combustivel_id === item.combustivel.id);
          return { litros: item.litros, custoMedio: estoque ? estoque.custo_medio : null };
        }),
        totalVendas
      );
      setEstimatedProfit(profit);
      setAverageMargin(margin);

      // Evolução mensal REAL (últimos 6 meses): antes os 5 meses passados eram
      // preenchidos com Math.random() e o gráfico mudava a cada render. Agora
      // mês sem venda lançada aparece como 0 — gráfico vazio é honesto.
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const serieMensal = serieVendaMensal(
        leiturasJanela.map(l => ({ mes: l.data.slice(0, 7), litros: l.litros_vendidos || 0 })),
        selectedMonth,
        6
      );
      const evolutionData: MonthlyData[] = serieMensal.map((ponto, idx) => ({
        month: monthNames[Number(ponto.mes.slice(5)) - 1],
        volume: ponto.litros,
        isCurrent: idx === serieMensal.length - 1,
      }));
      setMonthlyEvolution(evolutionData);

    } catch (err) {
      console.error('Error loading sales data:', err);
      setError('Erro ao carregar dados de vendas.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, postoAtivoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format helpers
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatMonthDisplay = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthNames[month - 1]} ${year}`;
  };

  return {
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    salesSummary,
    monthlyEvolution,
    productMix,
    averageMargin,
    estimatedProfit,
    loadData,
    formatCurrency,
    formatNumber,
    formatMonthDisplay
  };
};
