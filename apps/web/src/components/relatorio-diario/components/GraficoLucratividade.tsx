import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { ShiftData } from '../types';

interface GraficoLucratividadeProps {
    shiftsData: ShiftData[];
    fmtMoney: (val: number) => string;
}

const GraficoLucratividade: React.FC<GraficoLucratividadeProps> = ({ shiftsData, fmtMoney }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[400px]">
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 uppercase tracking-tight">
                <TrendingUp size={20} className="text-green-600" />
                Lucratividade vs Quebras
            </h3>
            <ResponsiveContainer width="99%" height="85%">
                <BarChart data={shiftsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="turnoName" tickLine={false} axisLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip
                        formatter={(value: number) => fmtMoney(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="lucro" name="Lucro Bruto" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="diferenca" name="Diferença Caixa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoLucratividade;
