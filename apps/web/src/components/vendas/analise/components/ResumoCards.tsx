import React from 'react';
import { Droplet, DollarSign, Coins, PieChart, Percent, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Totals } from '../types';
import { formatarMoeda } from '../../../../utils/formatters';

interface ResumoCardsProps {
  totals: Totals;
  variations: {
    volume: number;
    revenue: number;
    profit: number;
  };
}

const ResumoCards: React.FC<ResumoCardsProps> = ({ totals, variations }) => {
  const renderVariation = (value: number) => {
    if (value === 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
          <Minus size={12} />
          0%
        </div>
      );
    }
    if (value > 0) {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold mt-1">
          <TrendingUp size={12} />
          +{value.toFixed(1)}%
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-bold mt-1">
        <TrendingDown size={12} />
        {value.toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Vendido */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
        <div className="flex items-center gap-2 text-gray-500">
          <Droplet size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Total Vendido</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">
            {totals.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
          </h3>
          {renderVariation(variations.volume)}
        </div>
      </div>

      {/* Card 2: Faturamento */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
        <div className="flex items-center gap-2 text-gray-500">
          <DollarSign size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Faturamento</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">
            {formatarMoeda(totals.revenue)}
          </h3>
          {renderVariation(variations.revenue)}
        </div>
      </div>

      {/* Card 3: Lucro Total (Highlighted) */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Coins size={60} className="text-blue-600" />
        </div>
        <div className="flex items-center gap-2 text-blue-700">
          <PieChart size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Lucro Total</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-blue-900">
            {formatarMoeda(totals.profit)}
          </h3>
          {renderVariation(variations.profit)}
        </div>
      </div>

      {/* Card 4: Margem Média */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
        <div className="flex items-center gap-2 text-gray-500">
          <Percent size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Margem Média</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">{totals.avgMargin.toFixed(2)}%</h3>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
            <Minus size={12} />
            Estável
          </div>
        </div>
      </div>

      {/* Card 5: Lucro Médio/L */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
        <div className="flex items-center gap-2 text-gray-500">
          <DollarSign size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Lucro Médio/L</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">
            {formatarMoeda(totals.avgProfitPerLiter)}
          </h3>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
            <Minus size={12} />
            Estável
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumoCards;
