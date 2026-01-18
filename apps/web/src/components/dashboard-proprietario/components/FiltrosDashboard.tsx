import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { PeriodoFiltro } from '../types';

interface FiltrosDashboardProps {
  periodo: PeriodoFiltro;
  onPeriodoChange: (periodo: PeriodoFiltro) => void;
  onRefresh: () => void;
  loading: boolean;
  nomePosto?: string;
}

export const FiltrosDashboard: React.FC<FiltrosDashboardProps> = ({
  periodo,
  onPeriodoChange,
  onRefresh,
  loading,
  nomePosto
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
            <Calendar className="w-6 h-6" />
          </div>
          Visão do Proprietário - {nomePosto || 'Geral'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 ml-14">
          Acompanhamento consolidado de performance
        </p>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {(['hoje', 'semana', 'mes'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodoChange(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              periodo === p
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? '7 Dias' : 'Este Mês'}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          onClick={onRefresh}
          disabled={loading}
          className={`p-2 rounded-lg transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'hover:bg-blue-50 text-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20'
          }`}
          title="Atualizar dados"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
