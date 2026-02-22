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
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { paraReais } from '../../../../utils/formatters';
import type { DadosCombustivel, DadosPagamentoChart } from '../../services/calculosResumo';

/**
 * Propriedades para o componente de gráficos de resumo.
 */
interface ResumoGraficosProps {
    /** Dados processados de venda por tipo de combustível (Volume e Valor) */
    dadosCombustivel: DadosCombustivel[];
    /** Dados processados de distribuição por forma de pagamento */
    dadosPagamentos: DadosPagamentoChart[];
}

// Constantes de cores para o gráfico de pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

/**
 * Componente responsável por renderizar os gráficos estatísticos do fechamento.
 * Inclui:
 * - Gráfico de Barras: Volume por Combustível
 * - Gráfico de Barras: Faturamento por Combustível
 * - Gráfico de Pizza: Distribuição de Pagamentos
 *
 * @param props ResumoGraficosProps
 * @returns React Component
 */
export const ResumoGraficos: React.FC<ResumoGraficosProps> = ({ dadosCombustivel, dadosPagamentos }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Volume */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
                <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-blue-500">●</span> Volume por Combustível (L)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={dadosCombustivel}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#4B5563" />
                            <YAxis tick={{ fill: '#9CA3AF' }} stroke="#4B5563" />
                            <Tooltip
                                formatter={(value) => [`${Number(value).toFixed(2)} L`, 'Litros']}
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#93C5FD' }}
                            />
                            <Bar dataKey="litros" fill="#3b82f6" name="Litros" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Faturamento */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
                <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-emerald-500">●</span> Faturamento (R$)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={dadosCombustivel}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#4B5563" />
                            <YAxis tick={{ fill: '#9CA3AF' }} stroke="#4B5563" />
                            <Tooltip
                                formatter={(value) => [paraReais(Number(value)), 'Valor']}
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                itemStyle={{ color: '#6EE7B7' }}
                            />
                            <Bar dataKey="valor" fill="#10b981" name="Valor" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Pagamentos */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
                <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-purple-500">●</span> Pagamentos</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                            <Pie
                                data={dadosPagamentos}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {dadosPagamentos.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => paraReais(Number(value))}
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ fontSize: '12px', color: '#9CA3AF', paddingTop: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
