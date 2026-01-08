import React from 'react';
import { TrendingUp, Banknote, CreditCard } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Legend } from 'recharts';
import { FUEL_CHART_COLORS, PAYMENT_CHART_COLORS } from './constants';
import { PaymentEntry } from './types';
import { parseValue } from './utils';

interface FechamentoChartsProps {
    summaryData: { nome: string; codigo: string; litros: number; valor: number; preco: number }[];
    payments: PaymentEntry[];
    activeTab: 'leituras' | 'financeiro';
}

export const FechamentoCharts: React.FC<FechamentoChartsProps> = ({ summaryData, payments, activeTab }) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${activeTab === 'leituras' ? 'contents' : 'hidden'}`}>
            {/* Chart 1: Volume por Combustível */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" />
                    Volume por Combustível (L)
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={summaryData.filter(item => item.litros > 0)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="codigo"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                                formatter={(value: number) => [`${value.toFixed(3)} L`, 'Volume']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="litros" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                {summaryData.filter(item => item.litros > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={FUEL_CHART_COLORS[entry.codigo] || '#CBD5E1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Receita por Combustível */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Banknote size={16} className="text-green-500" />
                    Faturamento por Combustível (R$)
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={summaryData.filter(item => item.valor > 0)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="codigo"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                tickFormatter={(value) => `R$${value / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                {summaryData.filter(item => item.valor > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={FUEL_CHART_COLORS[entry.codigo] || '#CBD5E1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 3: Formas de Pagamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CreditCard size={16} className="text-purple-500" />
                    Distribuição de Pagamentos
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={payments.filter(p => parseValue(p.valor) > 0).map(p => ({ name: p.nome, value: parseValue(p.valor) }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {payments.filter(p => parseValue(p.valor) > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PAYMENT_CHART_COLORS[index % PAYMENT_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Montante']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                layout="horizontal"
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
