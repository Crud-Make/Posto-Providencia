// [10/01 08:36] Componente de painel de insights de IA
// [10/01 17:13] Adicionado JSDoc completo
import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';
import { AIInsight } from '../types';

/**
 * Props do componente AIInsightsPanel
 * @interface AIInsightsPanelProps
 */
interface AIInsightsPanelProps {
    /** Lista de insights gerados pela IA */
    insights: AIInsight[];
}

/**
 * Componente que exibe painel com insights gerados pela IA.
 * Mostra oportunidades, alertas e recomendações baseadas em análise de dados.
 * 
 * @component
 * @param {AIInsightsPanelProps} props - Props do componente
 * @returns {JSX.Element} Painel com lista de insights
 */
export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Insights IA
                </h2>
                {insights.length > 0 && (
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                        {insights.length} Novos
                    </span>
                )}
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {insights.length > 0 ? insights.map(insight => (
                    <div key={insight.id} className={`p-3 rounded-lg border ${insight.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                        insight.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
                            insight.severity === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        }`}>
                        <div className="flex items-start gap-2">
                            {insight.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" /> :
                                insight.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" /> :
                                    insight.severity === 'success' ? <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5" /> :
                                        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />}
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase ${insight.severity === 'critical' ? 'text-red-700 dark:text-red-400' :
                                    insight.severity === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                                        insight.severity === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                                            'text-blue-700 dark:text-blue-400'
                                    }`}>{insight.title}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{insight.message}</p>
                                {insight.actionLabel && (
                                    <button className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                        {insight.actionLabel} →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8">
                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Nenhum insight no momento</p>
                        <p className="text-slate-400 text-xs">Os insights serão gerados conforme mais dados forem coletados</p>
                    </div>
                )}
            </div>
        </div>
    );
};
