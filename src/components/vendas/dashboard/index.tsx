import React from 'react';
import {
  Calendar,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useDashboardVendas } from './hooks/useDashboardVendas';
import CardsKpi from './components/CardsKpi';
import GraficoEvolucao from './components/GraficoEvolucao';
import MixProdutosWidget from './components/MixProdutosWidget';

const TelaDashboardVendas: React.FC = () => {
  const {
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
  } = useDashboardVendas();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-500 dark:text-gray-400 font-medium">Carregando dados de vendas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="hover:text-blue-600 cursor-pointer transition-colors">Home</span>
        <span>/</span>
        <span className="hover:text-blue-600 cursor-pointer transition-colors">Relatórios</span>
        <span>/</span>
        <span className="font-semibold text-gray-900 dark:text-white">Dashboard de Vendas</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">Dashboard de Vendas</h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Período de Análise:</span>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg shadow-sm">
              <Calendar size={18} className="text-blue-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="font-bold text-gray-900 dark:text-white text-sm outline-none border-none bg-transparent"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <Printer size={18} />
            <span>Imprimir</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
            <Download size={18} />
            <span>Exportar Dados</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <CardsKpi
        salesSummary={salesSummary}
        estimatedProfit={estimatedProfit}
        averageMargin={averageMargin}
        formatNumber={formatNumber}
        formatCurrency={formatCurrency}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Sales Evolution Chart */}
        <GraficoEvolucao
          monthlyEvolution={monthlyEvolution}
          selectedMonth={selectedMonth}
          formatNumber={formatNumber}
          formatMonthDisplay={formatMonthDisplay}
        />

        {/* Right Column: Mix & Highlights */}
        <div className="space-y-6">
          <MixProdutosWidget
            productMix={productMix}
            formatNumber={formatNumber}
          />
        </div>
      </div>
    </div>
  );
};

export default TelaDashboardVendas;
