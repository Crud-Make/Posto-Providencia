import React from 'react';
import { Calendar, Filter, X, Search } from 'lucide-react';
import { FiltrosFinanceiros as IFiltros } from '../hooks/useFiltrosFinanceiros';

/**
 * Props do componente FiltrosFinanceiros.
 */
interface FiltrosFinanceirosProps {
  /** Estado atual dos filtros */
  filtros: IFiltros;
  /** Função callback para aplicar alteração em um filtro específico */
  onAplicar: (campo: keyof IFiltros, valor: IFiltros[keyof IFiltros]) => void;
  /** Função callback para resetar filtros */
  onReset: () => void;
  /** Função callback para aplicar preset de data */
  onPreset: (preset: 'hoje' | 'semana' | 'mes' | 'ano') => void;
}

/**
 * Componente de barra de filtros para o painel financeiro.
 * 
 * Permite filtrar por intervalo de datas, tipo de transação e aplicar presets rápidos.
 */
export const FiltrosFinanceiros: React.FC<FiltrosFinanceirosProps> = ({
  filtros,
  onAplicar,
  onReset,
  onPreset
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Presets */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {(['hoje', 'semana', 'mes', 'ano'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onPreset(preset)}
              className="px-4 py-2 text-sm font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors capitalize whitespace-nowrap"
            >
              {preset === 'mes' ? 'Mês' : preset}
            </button>
          ))}
        </div>

        {/* Date Range & Type */}
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
            <Calendar size={20} className="text-gray-500" />
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => onAplicar('dataInicio', e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 dark:text-white outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => onAplicar('dataFim', e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900 dark:text-white outline-none"
            />
          </div>

          <div className="relative w-full md:w-48">
            <select
              value={filtros.tipoTransacao}
              onChange={(e) => onAplicar('tipoTransacao', e.target.value)}
              className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-2 pl-4 pr-10 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="todas">Todas Transações</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <button
            onClick={onReset}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Limpar Filtros"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
