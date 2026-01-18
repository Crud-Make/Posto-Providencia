import React from 'react';
import { Package, AlertTriangle, DollarSign } from 'lucide-react';
import { formatarMoeda } from '../../../../utils/formatters';

interface StatsEstoqueProps {
  stats: {
    lowStockCount: number;
    totalValue: number;
    totalProducts: number;
  };
}

const StatsEstoque: React.FC<StatsEstoqueProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Produtos</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalProducts}</p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Package size={24} />
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Itens com Estoque Baixo</p>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.lowStockCount}</p>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
          <AlertTriangle size={24} />
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor em Estoque (Custo)</p>
          <p className="text-2xl font-black text-green-600 mt-1">
            {formatarMoeda(stats.totalValue)}
          </p>
        </div>
        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
          <DollarSign size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatsEstoque;
