// [10/01 08:45] Componente de cards de métricas
// [10/01 17:12] Adicionado JSDoc completo
import React from 'react';
import { TrendingUp, TrendingDown, Fuel, BarChart3, Target } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { formatCurrency, formatVolume } from '../utils';

/**
 * Props do componente MetricsCards
 * @interface MetricsCardsProps
 */
interface MetricsCardsProps {
    /** Métricas do dashboard ou null se ainda não carregadas */
    metrics: DashboardMetrics | null;
}

/**
 * Componente que exibe cards com as principais métricas do dashboard.
 * Mostra receita projetada, volume de vendas, margem média e score de eficiência.
 * 
 * @component
 * @param {MetricsCardsProps} props - Props do componente
 * @returns {JSX.Element} Grid com 4 cards de métricas
 * 
 * @example
 * ```tsx
 * <MetricsCards metrics={dashboardMetrics} />
 * ```
 */
export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita Projetada */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receita Projetada</p>
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {metrics ? formatCurrency(metrics.receitaProjetada) : 'R$ 0'}
                    </h3>
                    {metrics && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.receitaVariacao >= 0
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                            }`}>
                            {metrics.receitaVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                            {Math.abs(metrics.receitaVariacao).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    vs. {metrics ? formatCurrency(metrics.receitaMesAnterior) : 'R$ 0'} mês anterior
                </p>
            </div>

            {/* Volume de Vendas */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume de Vendas</p>
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Fuel className="w-4 h-4 text-blue-500" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {metrics ? formatVolume(metrics.volumeVendas) : '0 L'}
                    </h3>
                    {metrics && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.volumeVariacao >= 0
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                            }`}>
                            {metrics.volumeVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                            {Math.abs(metrics.volumeVariacao).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2">Este mês até agora</p>
            </div>

            {/* Margem Média */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-orange-500"></div>
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margem Média</p>
                    <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {metrics ? `${metrics.margemMedia.toFixed(1)}%` : '0%'}
                    </h3>
                    {metrics && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.margemVariacao >= 0
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                            }`}>
                            {metrics.margemVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                            {Math.abs(metrics.margemVariacao).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2">Lucro líquido sobre vendas</p>
            </div>

            {/* Score de Eficiência */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score de Eficiência</p>
                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <Target className="w-4 h-4 text-purple-500" />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {metrics ? `${metrics.scoreEficiencia.toFixed(1)}/10` : '0/10'}
                    </h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {metrics && metrics.scoreEficiencia >= 8 ? 'Excelente' : metrics && metrics.scoreEficiencia >= 6 ? 'Bom' : 'Atenção'}
                    </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Baseado em margem e operação</p>
            </div>
        </div>
    );
};
