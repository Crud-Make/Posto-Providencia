import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface HistoryData {
    data: string;
    volume_livro: number | null;
    volume_fisico: number | null;
}

interface InventoryHistoryChartProps {
    data: HistoryData[];
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
            <div className="w-full h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm">Sem dados históricos para {tankName}</span>
            </div>
        );
    }

    // Format date for XAxis (DD/MM)
    const formattedData = data.map(item => ({
        ...item,
        formattedDate: new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Histórico: {tankName}</h3>
            </div>
            <div className="p-4">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                            <defs>
                                <linearGradient id={`colorLivro-${tankName}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id={`colorFisico-${tankName}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="formattedDate"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px' }}
                                itemStyle={{ color: '#f3f4f6' }}
                                formatter={(value: number, name: string) => [
                                    `${value ? value.toLocaleString('pt-BR') : 0} L`,
                                    name === 'volume_livro' ? 'Estoque Calculado (Livro)' : 'Estoque Físico'
                                ]}
                                labelFormatter={(label) => `Data: ${label}`}
                            />
                            <Legend content={<LegendWrapper />} />
                            <Area
                                type="monotone"
                                dataKey="volume_livro"
                                name="volume_livro"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill={`url(#colorLivro-${tankName})`}
                            />
                            {/* Se tiver volume físico, plota também. Mas geralmente é um ou outro no input diário.
                  Se tiver ambos, ótimo. */}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
