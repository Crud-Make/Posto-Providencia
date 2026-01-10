// [10/01 08:45] Componente de gráfico de volume semanal
import React from 'react';
import { Calendar } from 'lucide-react';
import { DailyVolumeData } from '../types';
import { formatCurrency } from '../utils';

interface WeeklyVolumeChartProps {
    weeklyVolume: DailyVolumeData[];
    maxVolume: number;
}

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({ weeklyVolume, maxVolume }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Vendas da Semana</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Volume diário com projeções</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Semana Atual</span>
                </div>
            </div>

            <div className="h-52 w-full flex items-end justify-between gap-3 px-2">
                {weeklyVolume.map((day, idx) => {
                    const heightPercent = maxVolume > 0 ? (day.volume / maxVolume) * 100 : 0;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group">
                            <div className="w-full relative" style={{ height: '180px' }}>
                                <div
                                    className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${day.isProjection
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400'
                                        : 'bg-indigo-500'
                                        } ${day.isToday ? 'ring-2 ring-indigo-300 dark:ring-indigo-600' : ''}`}
                                    style={{ height: `${heightPercent}%` }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                                        {formatCurrency(day.volume)}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs mt-2 ${day.isToday ? 'font-bold text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                {day.diaSemana}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-indigo-500"></span>
                    <span className="text-xs text-slate-500">Realizado</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded border-2 border-dashed border-indigo-400 bg-indigo-50"></span>
                    <span className="text-xs text-slate-500">Projeção</span>
                </div>
            </div>
        </div>
    );
};
