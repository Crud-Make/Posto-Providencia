import React from 'react';
import { PieChart } from 'lucide-react';
import { ProfitabilityData } from '../types';
import { formatarMoeda } from '../../../../utils/formatters';

interface LucratividadeWidgetProps {
  profitability: ProfitabilityData[];
}

const LucratividadeWidget: React.FC<LucratividadeWidgetProps> = ({ profitability }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
          <PieChart size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 leading-tight">Lucratividade por <br /> Produto</h3>
      </div>

      <div className="space-y-6">
        {profitability.length === 0 ? (
          <div className="text-center text-gray-400 text-sm italic py-4">Sem dados de lucratividade.</div>
        ) : (
          profitability.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-gray-900">{formatarMoeda(item.value)}</span>
                  <span className="text-xs text-gray-400">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }}></div>
              </div>
              <p className="text-xs text-gray-400">Margem: {item.margin.toFixed(1)}%</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LucratividadeWidget;
