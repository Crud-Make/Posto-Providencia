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
  Calendar,
  ChevronDown,
  Loader2,
  User,
  Droplet,
  TrendingUp,
} from 'lucide-react';
import KPICard from './components/KPICard';
import FuelVolumeChart from './components/FuelVolumeChart';
import ClosingsTable from './components/ClosingsTable';
import PerformanceSidebar from './components/PerformanceSidebar';
import { useDashboard } from './hooks/useDashboard';
import { useNavigate } from 'react-router-dom';

// [14/01 07:00] Refatorado para usar useNavigate em vez de prop callback.
// Permite navegação direta para a rota de fechamento.

const TelaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    data,
    selectedDate,
    setSelectedDate,
    selectedFrentista,
    setSelectedFrentista,
    showDateDropdown,
    setShowDateDropdown,
    showFrentistaDropdown,
    setShowFrentistaDropdown,
    frentistas,
    dateRef,
    frentistaRef,
    clearFilters,
    getDateLabel,
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
        {/* Date Filter */}
        <div className="relative" ref={dateRef}>
          <div
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Data:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{getDateLabel()}</span>
            <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
          </div>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
              {[
                { value: 'hoje', label: 'Hoje' },
                { value: 'ontem', label: 'Ontem' },
                { value: 'semana', label: 'Última Semana' },
                { value: 'mes', label: 'Este Mês' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedDate(opt.value); setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedDate === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frentista Filter */}
        <div className="relative" ref={frentistaRef}>
          <div
            onClick={() => setShowFrentistaDropdown(!showFrentistaDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <User size={16} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Frentista:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{getFrentistaLabel()}</span>
            <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${showFrentistaDropdown ? 'rotate-180' : ''}`} />
          </div>
          {showFrentistaDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setSelectedFrentista(null); setShowFrentistaDropdown(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedFrentista === null ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
              >
                Todos
              </button>
              {frentistas.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFrentista(f.id); setShowFrentistaDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedFrentista === f.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>

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
          <FuelVolumeChart data={data.fuelData} />
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
