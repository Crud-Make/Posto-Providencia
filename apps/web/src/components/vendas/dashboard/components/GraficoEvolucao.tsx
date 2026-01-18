import React from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyData } from '../types';

interface GraficoEvolucaoProps {
  monthlyEvolution: MonthlyData[];
  selectedMonth: string;
  formatNumber: (value: number) => string;
  formatMonthDisplay: (monthStr: string) => string;
}

const GraficoEvolucao: React.FC<GraficoEvolucaoProps> = ({
  monthlyEvolution,
  selectedMonth,
  formatNumber,
  formatMonthDisplay
}) => {
  // Calculate max volume for chart scaling
  const maxVolume = Math.max(...monthlyEvolution.map(d => d.volume), 1);

  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evolução de Vendas (Últimos 6 Meses)</h3>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Volume (L)</span>
      </div>

      {/* Chart Container */}
      {monthlyEvolution.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex items-center justify-center text-gray-400 italic">
          Sem dados históricos.
        </div>
      ) : (
        <div className="flex-1 relative min-h-[300px] flex items-end justify-between px-4 pb-2 pt-12">
          {/* Reference Grid Lines */}
          <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
            <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
            <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
            <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
            <div className="w-full border-b border-gray-200 dark:border-gray-700 h-0"></div>
          </div>

          {/* Bars */}
          {monthlyEvolution.map((data, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center gap-3 w-full group">
              <div className="relative w-full flex justify-center items-end h-[280px]">
                <div
                  className={`w-12 sm:w-16 rounded-t-sm transition-all duration-500 relative group-hover:opacity-90
                  ${data.isCurrent ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-blue-100'}
                `}
                  style={{ height: `${(data.volume / maxVolume) * 100}%` }}
                >
                  {/* Reference Line for Current Month */}
                  {data.isCurrent && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-blue-600">{formatNumber(data.volume)}</span>
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                    {formatNumber(data.volume)} L
                  </div>
                </div>
              </div>
              <span className={`text-sm font-medium ${data.isCurrent ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                {data.month}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
        <div className="flex items-center gap-2">
          <div className="size-3 bg-blue-500 rounded-sm"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Vendas {new Date().getFullYear()}</span>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
          <TrendingUp size={12} />
          Período: {formatMonthDisplay(selectedMonth)}
        </div>
      </div>
    </div>
  );
};

export default GraficoEvolucao;
