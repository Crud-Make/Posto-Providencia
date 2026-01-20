import React from 'react';
import { DollarSign, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { DailyTotals } from '../types';

interface ResumoKPIsProps {
    totals: DailyTotals;
    expensesCount: number;
    fmtMoney: (val: number) => string;
    fmtLitros: (val: number) => string;
}

const ResumoKPIs: React.FC<ResumoKPIsProps> = ({ totals, expensesCount, fmtMoney, fmtLitros }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Vendas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <DollarSign size={80} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <DollarSign size={20} />
                    </div>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 font-display uppercase tracking-wider">Vendas Totais</span>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 font-finance tracking-tight">{fmtMoney(totals.vendas)}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {fmtLitros(totals.litros)} vendidos
                </p>
            </div>

            {/* Despesas do Dia */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <ArrowRight size={80} className="text-red-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                        <ArrowRight size={20} className="rotate-90" />
                    </div>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 font-display uppercase tracking-wider">Despesas do Dia</span>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 font-finance tracking-tight">{fmtMoney(totals.despesas)}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {expensesCount} registros hoje
                </p>
            </div>

            {/* Lucro Líquido */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-blue-500/20 dark:border-blue-500/30 shadow-lg shadow-blue-500/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp size={80} className="text-blue-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <TrendingUp size={20} />
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-display uppercase tracking-wider">Lucro Líquido (Real)</span>
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 font-finance tracking-tight">{fmtMoney(totals.lucroLiquido)}</h3>
                <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, totals.lucro > 0 ? (totals.lucroLiquido / totals.lucro) * 100 : 0)}%` }}
                    />
                </div>
            </div>

            {/* Diferença de Caixa */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <AlertTriangle size={80} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${totals.diferenca < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 font-display uppercase tracking-wider">Diferença Caixa</span>
                </div>
                <h3 className={`text-3xl font-black ${totals.diferenca < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'} font-finance tracking-tight`}>
                    {fmtMoney(totals.diferenca)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Acumulado do dia
                </p>
            </div>
        </div>
    );
};

export default ResumoKPIs;
