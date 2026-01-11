import React from 'react';
import { PieChart } from 'lucide-react';
import { ProductMixItem } from '../types';

interface MixProdutosWidgetProps {
  productMix: ProductMixItem[];
  formatNumber: (value: number) => string;
}

const MixProdutosWidget: React.FC<MixProdutosWidgetProps> = ({ productMix, formatNumber }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <PieChart size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mix de Produtos (Litros)</h3>
      </div>

      <div className="space-y-6">
        {productMix.length === 0 ? (
          <div className="text-center text-gray-400 text-sm italic py-4">Sem dados de mix.</div>
        ) : (
          productMix.map((item) => (
            <div key={item.codigo} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{item.name}</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900 dark:text-white">{formatNumber(item.volume)} L</span>
                  <span className="text-xs text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MixProdutosWidget;
