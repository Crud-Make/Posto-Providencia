import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TankHistoryEntry } from '../types';

interface InventoryHistoryChartProps {
    data: TankHistoryEntry[];
    tankName: string;
}

interface LegendEntry {
    color?: string;
    value: string;
}

interface LegendWrapperProps {
    payload?: LegendEntry[];
}

const LegendWrapper: React.FC<LegendWrapperProps> = ({ payload }) => {
    if (!payload) return null;

    return (
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
            {payload.map((entry, index) => (
                <div key={`item-${index}`} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.value === 'volume_livro' ? 'Estoque Calculado (Livro)' : 'Estoque Físico'}</span>
                </div>
            ))}
        </div>
    );
};

export const InventoryHistoryChart: React.FC<InventoryHistoryChartProps> = ({ data, tankName }) => {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Aguardando dados históricos de {tankName}...</span>
            </div>
        );
    }

    // Format data and ensuring order
    const formattedData = [...data]
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .map(item => ({
            ...item,
            formattedDate: new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            volume_livro: Number(item.volume_livro) || 0,
            volume_fisico: Number(item.volume_fisico) || null
        }));

    // Sanitizar ID para SVG (remove espaços e caracteres especiais)
    const gradientId = `gradient-${tankName.replace(/[^a-zA-Z0-9]/g, '')}`;
    const mainColor = '#06b6d4'; // Cyan-500 (Neon)
    const glowColor = '#22d3ee'; // Cyan-400

    return (
        <div className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mainColor }}></span>
                    {tankName}
                </h3>
                <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-700">
                    30 Dias
                </span>
            </div>

            <div className="p-5">
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="99%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={mainColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={mainColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#374151"
                                opacity={0.1}
                            />

                            <XAxis
                                dataKey="formattedDate"
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                                minTickGap={30}
                            />

                            <YAxis
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#111827',
                                    borderColor: '#374151',
                                    color: '#f3f4f6',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '8px 12px',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: glowColor }}
                                labelStyle={{ color: '#9ca3af', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #374151' }}
                                formatter={(value: number) => [`${value?.toLocaleString('pt-BR')} L`, 'Volume']}
                                cursor={{ stroke: mainColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area
                                type="monotone"
                                dataKey="volume_livro"
                                stroke={mainColor}
                                strokeWidth={2}
                                fill={`url(#${gradientId})`}
                                activeDot={{ r: 4, strokeWidth: 0, fill: glowColor }}
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
