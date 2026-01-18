import React from 'react';
import { Calendar, RefreshCw, Download, BarChart2 } from 'lucide-react';

interface FiltroPeriodoProps {
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onRefresh: () => void;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const FiltroPeriodo: React.FC<FiltroPeriodoProps> = ({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onRefresh
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Análise de Vendas</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500">Período:</span>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Calendar size={16} className="text-blue-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="font-bold text-gray-900 text-sm outline-none bg-transparent cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="font-bold text-gray-900 text-sm outline-none bg-transparent cursor-pointer"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={18} />
          <span>Excel</span>
        </button>
        <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={18} />
          <span>PDF</span>
        </button>
        <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
          <BarChart2 size={18} />
          <span>Gráfico Detalhado</span>
        </button>
      </div>
    </div>
  );
};

export default FiltroPeriodo;
