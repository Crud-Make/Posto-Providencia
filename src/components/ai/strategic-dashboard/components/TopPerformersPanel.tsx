// [10/01 08:54] Componente de ranking de frentistas
import React from 'react';
import { Users } from 'lucide-react';
import { AttendantPerformance } from '../types';
import { formatCurrency } from '../utils';

interface TopPerformersPanelProps {
    topPerformers: AttendantPerformance[];
}

export const TopPerformersPanel: React.FC<TopPerformersPanelProps> = ({ topPerformers }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Performance da Equipe</h2>
                <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
                {topPerformers.length > 0 ? topPerformers.map((perf, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                }`}>
                                {idx + 1}º
                            </div>
                            <div>
                                <p className="font-medium text-slate-800 dark:text-white text-sm">{perf.nome}</p>
                                <p className="text-xs text-slate-500">{perf.turnos} dias no mês</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{formatCurrency(perf.vendaMedia)}</p>
                            <p className={`text-xs ${perf.diferencaAcumulada >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {perf.diferencaAcumulada >= 0 ? '+' : ''}{formatCurrency(perf.diferencaAcumulada)}
                            </p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-slate-500 py-4">Nenhum dado de frentistas disponível</p>
                )}
            </div>
        </div>
    );
};
