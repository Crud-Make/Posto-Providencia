import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { InventoryItem } from '../types';

interface InventoryFinancialChartsProps {
    items: InventoryItem[];
}

const InventoryFinancialCharts: React.FC<InventoryFinancialChartsProps> = ({ items }) => {
    // Transform data for charts using real data when available
    const data = items.map(item => {
        // Usa preços reais se disponíveis, senão zero
        const costPrice = item.costPrice || 0;
        const sellPrice = item.sellPrice || 0;

        return {
            name: item.code, // GC, GA, etc.
            fullName: item.name,
            volume: item.volume,
            custoUnit: costPrice,
            vendaUnit: sellPrice,
            valorCusto: costPrice > 0 ? item.volume * costPrice : 0,
            valorVenda: sellPrice > 0 ? item.volume * sellPrice : 0,
            lucroProjetado: (costPrice > 0 && sellPrice > 0) ? (item.volume * sellPrice) - (item.volume * costPrice) : 0
        };
    });

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
                    <p className="font-bold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs mb-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-500 font-medium">{entry.name}:</span>
                            <span className="font-bold text-gray-900 ml-auto">
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* Chart 1: Capital Composition */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="mb-6">
                    <h3 className="font-bold text-lg text-gray-900">Capital em Estoque</h3>
                    <p className="text-sm text-gray-500">Comparativo Custo vs. Potencial de Venda</p>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            barGap={0}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                tickFormatter={(value) => `R$${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="circle"
                                iconSize={8}
                            />
                            <Bar
                                dataKey="valorCusto"
                                name="Preço de Custo"
                                fill="#9ca3af"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                            <Bar
                                dataKey="valorVenda"
                                name="Preço de Venda"
                                fill="#13ec6d"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Projected Profit Breakdown */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Projeção de Lucro Bruto</h3>
                        <p className="text-sm text-gray-500">Lucro estimado por produto com base no estoque atual</p>
                    </div>
                    <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                        <span className="text-[10px] font-bold text-green-600 uppercase">Total Projetado</span>
                        <p className="text-lg font-black text-green-700">
                            {formatCurrency(data.reduce((acc, item) => acc + item.lucroProjetado, 0))}
                        </p>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                tick={{ fill: '#111827', fontSize: 12, fontWeight: 700 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                            <Bar
                                dataKey="lucroProjetado"
                                name="Lucro Projetado"
                                radius={[0, 4, 4, 0]}
                                barSize={24}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.name === 'GC' ? '#13ec6d' :
                                                entry.name === 'GA' ? '#60a5fa' :
                                                    entry.name === 'ET' ? '#fbbf24' :
                                                        '#f87171'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend for Products */}
                <div className="flex justify-center gap-4 mt-4">
                    {data.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                            <div className={`size-2 rounded-full 
                        ${item.name === 'GC' ? 'bg-[#13ec6d]' :
                                    item.name === 'GA' ? 'bg-blue-400' :
                                        item.name === 'ET' ? 'bg-yellow-400' : 'bg-red-400'}
                     `}></div>
                            <span className="text-xs font-medium text-gray-500">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default React.memo(InventoryFinancialCharts);
