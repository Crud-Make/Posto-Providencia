import React from 'react';
import { Star, AlertCircle, Trophy, Medal } from 'lucide-react';
import { AttendantPerformance } from '../types';

interface PerformanceSidebarProps {
  data: AttendantPerformance[];
}

const PerformanceSidebar: React.FC<PerformanceSidebarProps> = ({ data }) => {
  // Sort data by value (assuming higher is better, logic might vary per metric type)
  // For now we assume the incoming data is already sorted or we render in order.

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy size={16} className="text-yellow-500" />;
      case 1: return <Medal size={16} className="text-gray-400" />;
      case 2: return <Medal size={16} className="text-amber-600" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Performance Frentistas</h2>
            <p className="text-sm text-gray-500">Ranking do turno atual</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {(!data || data.length === 0) ? (
          <div className="text-center text-gray-400 text-sm italic py-10">
            Nenhum dado de performance.
          </div>
        ) : (
          data.map((item, index) => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${index < 3 ? 'border-gray-200' : 'border-transparent bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'text-yellow-600 bg-yellow-100' : index === 1 ? 'text-gray-600 bg-gray-100' : index === 2 ? 'text-amber-700 bg-amber-100' : 'text-gray-400'}`}>
                  {index + 1}º
                </div>

                <div className="relative">
                  <img src={item.avatar} alt={item.name} className={`w-12 h-12 rounded-full object-cover border-2 ${index === 0 ? 'border-yellow-400' : 'border-gray-200'}`} />
                  {item.type === 'ticket' && (
                    <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1 rounded-full border-2 border-white">
                      <Star size={10} fill="white" />
                    </div>
                  )}
                  {item.type === 'divergence' && (
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full border-2 border-white">
                      <AlertCircle size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className={`text-xs ${item.type === 'divergence' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{item.metric}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${item.type === 'divergence' ? 'text-red-600' : 'text-gray-900'}`}>{item.value}</p>
                <div className="flex items-center justify-end gap-1">
                  {getRankIcon(index)}
                  <p className={`text-xs font-medium ${item.type === 'ticket' ? 'text-green-600' : (item.type === 'volume' ? 'text-blue-600' : 'text-gray-400')}`}>{item.subValue}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
          <Trophy size={16} />
          Ver Ranking Completo
        </button>
      </div>
    </div>
  );
};

export default PerformanceSidebar;
