import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAnaliseVendas } from './hooks/useAnaliseVendas';
import FiltroPeriodo from './components/FiltroPeriodo';
import ResumoCards from './components/ResumoCards';
import TabelaVendas from './components/TabelaVendas';
import LucratividadeWidget from './components/LucratividadeWidget';
import InsightsWidget from './components/InsightsWidget';

const TelaAnaliseVendas: React.FC = () => {
  const {
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
  } = useAnaliseVendas();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-500 font-medium">Carregando análise de vendas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-blue-600 cursor-pointer transition-colors">Home</span>
        <span>/</span>
        <span className="hover:text-blue-600 cursor-pointer transition-colors">Relatórios</span>
        <span>/</span>
        <span className="font-semibold text-gray-900">Vendas Mensais</span>
      </div>

      {/* Header & Filter */}
      <FiltroPeriodo
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        onRefresh={loadData}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <ResumoCards totals={totals} variations={variations} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sales Table */}
        <TabelaVendas products={products} totals={totals} />

        {/* Right Column: Profitability & Insights */}
        <div className="space-y-6">
          <LucratividadeWidget profitability={profitability} />
          <InsightsWidget insights={insights} />
        </div>
      </div>
    </div>
  );
};

export default TelaAnaliseVendas;
