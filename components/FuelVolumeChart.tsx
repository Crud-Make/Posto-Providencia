import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FuelData } from '../types';

interface FuelVolumeChartProps {
  data: FuelData[];
}

const FuelVolumeChart: React.FC<FuelVolumeChartProps> = ({ data }) => {
  // Custom tooltip to show properly formatted values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {payload[0].value.toLocaleString('pt-BR')} Litros
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Volume Vendido (Litros)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total de litros por combustível</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        {(!data || data.length === 0) ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm italic">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default FuelVolumeChart;
