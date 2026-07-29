// [13/01 10:20] Adicionado JSDoc para conformidade com Regra 5/Qualidade
/**
 * Tela de Dashboard Principal (Visão Geral do Posto)
 *
 * Exibe os principais indicadores de desempenho (KPIs), gráficos de volume de combustível
 * e tabela de fechamentos recentes. Permite filtrar por data e frentista.
 *
 * @module TelaDashboard
 */
import React from 'react';
import {
  Download,
  Plus,
  Banknote,
  Loader2,
  User,
  Droplet,
  TrendingUp,
} from 'lucide-react';
import KPICard from './components/KPICard';
import ClosingsTable from './components/ClosingsTable';
import PerformanceSidebar from './components/PerformanceSidebar';
import FilterDropdown from './components/filter-dropdown';
import DateRangePicker from './components/date-range-picker';
import { useDashboard } from './hooks/useDashboard';
import { useNavigate } from 'react-router-dom';

// [14/01 07:00] Refatorado para usar useNavigate em vez de prop callback.
// Permite navegação direta para a rota de fechamento.

// Lazy: FuelVolumeChart puxa o recharts (chunk vendor-charts). Import estático
// travaria o primeiro paint da tela inteira esperando a lib de gráficos baixar.
// O import dispara já na avaliação do módulo (não na montagem) pra baixar o chunk
// em paralelo com as queries do dashboard — lazy puro só começaria o download
// depois dos dados chegarem, serializando rede de dados + rede de código.
const fuelVolumeChartImport = import('./components/FuelVolumeChart');
const FuelVolumeChart = React.lazy(() => fuelVolumeChartImport);

/** Placeholder com as mesmas dimensões do card do gráfico, pra não deslocar o layout. */
const ChartSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full flex flex-col animate-pulse">
    <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded mb-6"></div>
    <div className="flex-1 min-h-[300px] bg-gray-50 dark:bg-gray-700/50 rounded"></div>
  </div>
);

const TelaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    data,
    periodo,
    setPeriodo,
    selectedFrentista,
    setSelectedFrentista,
    frentistas,
    clearFilters,
    getFrentistaLabel
  } = useDashboard();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando dados do sistema...</p>
      </div>
    );
  }

  // Safety check
  if (!data) return null;

  // [18/01 10:34] Adicionado fallback para `kpis` evitando crash em respostas incompletas.
  const kpis = data.kpis ?? {
    totalSales: 0,
    avgTicket: 0,
    totalDivergence: 0,
    totalVolume: 0,
    totalProfit: 0,
  };

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Visão Geral do Posto</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe os indicadores do dia e o status operacional.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download size={16} />
            Exportar
          </button>
          <button
            onClick={() => navigate('/fechamento')}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Novo Fechamento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <DateRangePicker periodo={periodo} onChange={setPeriodo} />

        <FilterDropdown<number | null>
          Icon={User}
          label="Frentista:"
          selectedLabel={getFrentistaLabel()}
          selectedValue={selectedFrentista}
          options={[
            { value: null, label: 'Todos' },
            ...frentistas.map(f => ({ value: f.id, label: f.nome }))
          ]}
          onSelect={setSelectedFrentista}
          scrollable
        />

        <button
          onClick={clearFilters}
          className="ml-auto text-sm text-blue-700 font-medium hover:underline"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Loading overlay for filter changes */}
      {loading && (
        <div className="fixed inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-40">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard
          title="TOTAL VENDIDO"
          value={`R$ ${kpis.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trendValue="+12%"
          trendLabel="vs. ontem"
          isNegativeTrend={false}
          Icon={Banknote}
          iconBgColor="bg-red-50"
          iconColor="text-red-400"
        />
        <KPICard
          title="LITROS VENDIDOS"
          value={`${kpis.totalVolume?.toLocaleString('pt-BR') || '0'} L`}
          trendValue="+5%"
          trendLabel="vs. ontem"
          isNegativeTrend={false}
          Icon={Droplet}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-500"
        />
        <KPICard
          title="LUCRO ESTIMADO"
          value={`R$ ${kpis.totalProfit?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          trendValue="0%"
          trendLabel="Baseado na margem média"
          isNegativeTrend={false}
          Icon={TrendingUp}
          iconBgColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      {/* Main Grid: Charts & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 h-full">
          <React.Suspense fallback={<ChartSkeleton />}>
            <FuelVolumeChart data={data.fuelData} />
          </React.Suspense>
        </div>
        <div className="lg:col-span-1 h-full">
          <PerformanceSidebar data={data.performanceData} />
        </div>
      </div>

      {/* Closings Table */}
      <div className="mb-8">
        <ClosingsTable data={data.closingsData} />
      </div>
    </div>
  );
};

export default TelaDashboard;
