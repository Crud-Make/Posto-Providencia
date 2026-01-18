import React from 'react';
import { ArrowUp, Info } from 'lucide-react';
import { ProfitabilityItem } from '../types';

interface ResumoEconomicoProps {
    data: ProfitabilityItem[];
    totalProfitSum: number;
}

const ResumoEconomico: React.FC<ResumoEconomicoProps> = ({ data, totalProfitSum }) => {
    return (
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col p-6">
            <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Resumo Econômico</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mês vigente vs. Custos Médios</p>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Lucro Operacional Total</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">R$ {totalProfitSum.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                        <ArrowUp size={16} />
                        <span>Calculado via PEPS/Custo Médio</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase font-bold">Volume Total</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{data.reduce((acc, i) => acc + i.volumeVendido, 0).toLocaleString('pt-BR')} L</p>
                    </div>
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                        <p className="text-[10px] text-purple-500 dark:text-purple-400 uppercase font-bold">Receita Bruta</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">R$ {(data.reduce((acc, i) => acc + i.receitaBruta, 0) / 1000).toFixed(0)}k</p>
                    </div>
                </div>

                <div className="p-4 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Info size={14} className="text-blue-500" />
                        Base de Cálculo
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        As margens exibidas consideram o <strong>Custo Médio Ponderado</strong> de estoque e o rateio real das despesas registradas no mês.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResumoEconomico;
