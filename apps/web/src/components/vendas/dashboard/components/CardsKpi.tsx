import React from 'react';
import { Droplet, TrendingUp, TrendingDown, Banknote, RefreshCw, Percent } from 'lucide-react';
import { SalesSummary } from '../types';

interface CardsKpiProps {
  salesSummary: SalesSummary;
  estimatedProfit: number;
  averageMargin: number;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
}

const CardsKpi: React.FC<CardsKpiProps> = ({
  salesSummary,
  estimatedProfit,
  averageMargin,
  formatNumber,
  formatCurrency
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {/* Card 1: Litros Vendidos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Droplet size={18} className="text-blue-500" fill="currentColor" />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Litros Vendidos</span>
        </div>
        <div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{formatNumber(salesSummary.totalLitros)} L</h3>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold mt-2">
            <TrendingUp size={14} />
            Dados do mês
          </div>
        </div>
      </div>

      {/* Card 2: Faturamento */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Banknote size={18} className="text-green-500" />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Faturamento</span>
        </div>
        <div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(salesSummary.totalVendas)}</h3>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold mt-2">
            <TrendingUp size={14} />
            Receita bruta
          </div>
        </div>
      </div>

      {/* Card 3: Lucro Total */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group">
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <RefreshCw size={120} className="text-blue-600" />
        </div>
        <div className="flex items-center gap-2 text-blue-700 relative z-10">
          <Banknote size={18} fill="currentColor" />
          <span className="text-sm font-bold">Lucro Estimado</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-blue-600">{formatCurrency(estimatedProfit)}</h3>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-green-600 text-xs font-bold mt-2 shadow-sm border border-blue-100">
            <TrendingUp size={14} />
            Baseado no custo médio
          </div>
        </div>
      </div>

      {/* Card 4: Margem Média */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Percent size={18} className="text-orange-500" />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Margem Média</span>
        </div>
        <div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{averageMargin.toFixed(1)}%</h3>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold mt-2 ${averageMargin >= 10 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
            {averageMargin >= 10 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {averageMargin >= 10 ? 'Saudável' : 'Atenção'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardsKpi;
