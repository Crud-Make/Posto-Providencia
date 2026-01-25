import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FuelData } from '../../../types/ui/dashboard';

interface FuelVolumeChartProps {
  data: FuelData[];
}

const FuelVolumeChart: React.FC<FuelVolumeChartProps> = ({ data }) => {
  // 1. Sanitize Data: Remove negatives
  const chartData = data.map(d => ({
    ...d,
    volume: Math.max(0, d.volume)
  }));

  const hasData = chartData.some(d => d.volume > 0);

  // Custom tooltip
  interface TooltipPayloadItem {
    value: number;
    payload: { color: string };
  }
  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-2">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></div>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium font-finance">
              {payload[0].value.toLocaleString('pt-BR')} Litros
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getFuelColors = (name: string, index: number) => {
    const lower = name.toLowerCase();

    // Gasolina Comum -> Vermelho
    if (lower.includes('comum')) return ['#ef4444', '#b91c1c'];

    // Gasolina Aditivada -> Azul (padrão Grid/V-Power Racing as vezes associam a performance/azul)
    if (lower.includes('aditivada') || lower.includes('grid')) return ['#3b82f6', '#1d4ed8'];

    // Etanol -> Verde
    if (lower.includes('etanol') || lower.includes('álcool')) return ['#10b981', '#047857'];

    // Diesel S10 -> Laranja/Ambar
    if (lower.includes('diesel') && lower.includes('s10')) return ['#f59e0b', '#b45309'];

    // Outros Diesels -> Cinza Escuro
    if (lower.includes('diesel')) return ['#71717a', '#3f3f46'];

    // Fallback colors
    const fallbacks = [
      ['#8b5cf6', '#6d28d9'], // Violet
      ['#ec4899', '#be185d'], // Pink
      ['#06b6d4', '#0e7490'], // Cyan
    ];
    return fallbacks[index % fallbacks.length];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full"></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">Volume Vendido</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total de litros por combustível</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 italic gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p>Nenhum dado de volume registrado</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.map((d, i) => {
                const [start, end] = getFuelColors(d.name, i);
                return { ...d, color: start, colorEnd: end };
              })}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              barSize={45}
            >
              <defs>
                {chartData.map((d, i) => {
                  const [start, end] = getFuelColors(d.name, i);
                  return (
                    <linearGradient key={`grad-${i}`} id={`fuel-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={start} />
                      <stop offset="100%" stopColor={end} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                dy={12}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip cursor={{ fill: '#f9fafb', opacity: 0.5 }} content={<CustomTooltip />} />
              <Bar dataKey="volume" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#fuel-grad-${index})`} strokeWidth={0} />
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
