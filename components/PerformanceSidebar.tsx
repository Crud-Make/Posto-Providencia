
import React from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { AttendantPerformance } from '../types';

interface PerformanceSidebarProps {
  data: AttendantPerformance[];
}

const PerformanceSidebar: React.FC<PerformanceSidebarProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Performance Frentistas</h2>
      </div>

      <div className="flex-1 space-y-4">
        {(!data || data.length === 0) ? (
             <div className="text-center text-gray-400 text-sm italic py-10">
                Nenhum dado de performance.
             </div>
        ) : (
            data.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                <div className="relative">
                    <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                    {item.type === 'ticket' && (
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white p-0.5 rounded-full border-2 border-white">
                        <Star size={10} fill="white" />
                    </div>
                    )}
                    {item.type === 'divergence' && (
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-0.5 rounded-full border-2 border-white">
                        <AlertCircle size={10} />
                    </div>
                    )}
                </div>
                <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className={`text-xs ${item.type === 'divergence' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{item.metric}</p>
                </div>
                </div>
                <div className="text-right">
                <p className={`font-bold text-sm ${item.type === 'divergence' ? 'text-red-600' : 'text-gray-900'}`}>{item.value}</p>
                <p className={`text-xs ${item.type === 'ticket' ? 'text-green-600' : (item.type === 'volume' ? 'text-green-600' : 'text-gray-400')}`}>{item.subValue}</p>
                </div>
            </div>
            ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-blue-700 text-sm font-semibold rounded-lg transition-colors">
            Ver Ranking Completo
        </button>
      </div>
    </div>
  );
};

export default PerformanceSidebar;
