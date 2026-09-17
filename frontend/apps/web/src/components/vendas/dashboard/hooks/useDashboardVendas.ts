import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../../contexts/usePosto';
import { usePeriodo } from '../../../../contexts/usePeriodo';
import { leituraService, despesaService, compraService } from '../../../../services/api';
import { custoMedioPorCombustivel } from '../../../../services/custo-do-mes';
import { SalesSummary, MonthlyData, ProductMixItem } from '../types';
import { Combustivel } from '../../../../types/database/index';
import { isSuccess } from '../../../../types/ui/response-types';
import { corDoProduto, paraIsoLocal, serieVendaMensal } from '@posto/utils';
import { lucroEstimadoDashboard } from './calculos-dashboard-vendas';

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
  const [averageMargin, setAverageMargin] = useState<number | null>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number | null>(0);
  const [produtosSemCompra, setProdutosSemCompra] = useState<readonly string[]>([]);

  const loadData = useCallback(async () => {
    if (!postoAtivoId) return;

    try {
      setLoading(true);
      setError(null);

      // Janela de 6 meses terminando no mês selecionado: serve o resumo do mês e o
      // gráfico de evolução — toda barra vem de Leitura real.
      // [06/09/2026] UMA QUERY POR MÊS, em paralelo. A busca única de 6 meses passava
      // de 1.000 linhas (Mar–Ago/2026: 1.092) e o PostgREST corta em 1.000 sem avisar —
      // ordenado por data, o mês selecionado era o que perdia linhas: agosto mostrava
      // 17.706 L onde o Dashboard mostra 36.277 L. Um mês tem no máximo ~190 leituras.
      const [year, month] = selectedMonth.split('-').map(Number);
      const endDate = new Date(year, month, 0);
      const mesesDaJanela = Array.from({ length: 6 }, (_, i) => {
        const inicio = new Date(year, month - 6 + i, 1);
        const fim = new Date(year, month - 5 + i, 0);
        return { inicio: paraIsoLocal(inicio), fim: paraIsoLocal(fim) };
      });

      const resPorMes = await Promise.all(
        mesesDaJanela.map(m => leituraService.getByDateRange(m.inicio, m.fim, postoAtivoId))
      );
      const leiturasJanela = resPorMes.flatMap(r => (isSuccess(r) ? r.data : []));
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
        color: corDoProduto(item.combustivel.codigo).fundo,
      }));
      setProductMix(mixData);

      // Lucro estimado canônico (./calculos-dashboard-vendas): receita − litros ×
      // (custo médio + despesa/L do mês). [onda 3, grupo B] Antes a despesa
      // operacional ficava fora e o card inflava o lucro exatamente na despesa
      // do mês (R$ 195.230,40 nos 7 meses reais) — travado no golden ao lado.
      // [03/09] O custo é a compra do MÊS (`services/custo-do-mes`), não mais o
      // carimbo `Estoque.custo_medio`.
      const [resCompras, resDespesas] = await Promise.all([
        compraService.getByDateRange(paraIsoLocal(new Date(year, month - 1, 1)), paraIsoLocal(endDate), postoAtivoId),
        despesaService.getByMonth(year, month, postoAtivoId),
      ]);
      const custoDoMes = custoMedioPorCombustivel(isSuccess(resCompras) ? resCompras.data : []);
      const despesaDoMes = (isSuccess(resDespesas) ? resDespesas.data : []).reduce(
        (acc, d) => acc + Number(d.valor || 0),
        0
      );

      const lucro = lucroEstimadoDashboard(
        Object.values(byCombustivel).map(item => ({
          produto: item.combustivel.nome,
          litros: item.litros,
          valor: item.valor,
          custoMedio: custoDoMes(item.combustivel.id),
        })),
        despesaDoMes
      );
      setEstimatedProfit(lucro.profit);
      setAverageMargin(lucro.margin);
      setProdutosSemCompra(lucro.produtosSemCompra);

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
    produtosSemCompra,
    loadData,
    formatCurrency,
    formatNumber,
    formatMonthDisplay
  };
};
