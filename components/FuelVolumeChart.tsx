
import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { FuelData } from '../types';

interface FuelVolumeChartProps {
  data: FuelData[];
}

const FuelVolumeChart: React.FC<FuelVolumeChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Litros por Produto</h2>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {(!data || data.length === 0) ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm italic">
            Nenhum dado disponível
          </div>
        ) : (
          data.map((fuel) => (
            <div key={fuel.name}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-gray-700">{fuel.name}</span>
                <span className="text-sm font-bold text-gray-900">{fuel.volume.toLocaleString('pt-BR')} L</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${fuel.color}`} 
                  style={{ width: `${(fuel.volume / fuel.maxCapacity) * 100}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FuelVolumeChart;
