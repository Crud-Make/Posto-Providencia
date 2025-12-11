
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PaymentMethod } from '../types';

interface PaymentMixChartProps {
  data: PaymentMethod[];
}

const PaymentMixChart: React.FC<PaymentMixChartProps> = ({ data }) => {
  const totalPercentage = data.reduce((acc, curr) => acc + curr.percentage, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-yellow-400 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Mix de Pagamentos</h2>
        </div>
        <div className="text-gray-400">
            <PieChartIcon size={20} />
        </div>
      </div>

      {(!data || data.length === 0) ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic min-h-[200px]">
            Nenhum dado disponível
          </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 flex-1">
          {/* Chart */}
          <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                  data={data as any[]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="percentage"
                  stroke="none"
                  >
                  {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  </Pie>
              </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-500 font-medium">TOTAL</span>
                  <span className="text-xl font-bold text-gray-900">{totalPercentage}%</span>
              </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {data.map((item) => (
                  <div key={item.name} className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-[10px] font-bold text-gray-500 tracking-wider">{item.name}</span>
                      </div>
                      <div className="pl-5">
                          <span className="text-lg font-bold text-gray-900 block leading-none">{item.percentage}%</span>
                          <span className="text-xs text-gray-400">R$ {item.value.toLocaleString('pt-BR')}</span>
                      </div>
                  </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMixChart;