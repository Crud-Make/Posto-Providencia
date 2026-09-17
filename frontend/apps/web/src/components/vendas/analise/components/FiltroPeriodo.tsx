import React from 'react';
import { RefreshCw, Download, BarChart2 } from 'lucide-react';
import { Calendario, modoMes } from '@shared/ui/calendario';

interface FiltroPeriodoProps {
  /** Mês exibido, ISO local `aaaa-mm`. */
  mes: string;
  onMesChange: (mes: string) => void;
  onRefresh: () => void;
}

const FiltroPeriodo: React.FC<FiltroPeriodoProps> = ({
  mes,
  onMesChange,
  onRefresh
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Análise de Vendas</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500">Período:</span>
          <Calendario modo={modoMes} valor={mes} aoMudar={onMesChange} className="py-1.5" />
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
