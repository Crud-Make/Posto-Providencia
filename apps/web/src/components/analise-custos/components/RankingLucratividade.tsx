import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ProfitabilityItem } from '../types';

interface RankingLucratividadeProps {
    data: ProfitabilityItem[];
    totalProfitSum: number;
}

const RankingLucratividade: React.FC<RankingLucratividadeProps> = ({ data, totalProfitSum }) => {
    // Sort data for ranking
    const sortedData = [...data].sort((a, b) => (b.margemLiquidaL || 0) - (a.margemLiquidaL || 0));

    return (
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ranking de Lucratividade</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">Participação no lucro total do mês</span>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#f6f8f7] dark:bg-gray-700 text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-3">Produto</th>
                            <th className="px-6 py-3 text-right">Vendas (L)</th>
                            <th className="px-6 py-3 text-right">Margem Líq.</th>
                            <th className="px-6 py-3 text-right">Lucro Total</th>
                            <th className="px-6 py-3 text-center">% Part. Lucro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedData.map((item) => {
                            const share = totalProfitSum > 0 ? (item.lucroTotal / totalProfitSum) * 100 : 0;
                            return (
                                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${item.margemLiquidaL < 0.2 ? 'bg-red-50/30 dark:bg-red-900/20' : ''}`}>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`size-2 rounded-full`} style={{ backgroundColor: item.cor }}></div>
                                            <span className="font-medium text-gray-900 dark:text-white">{item.nome}</span>
                                            {item.margemLiquidaL < 0.2 && <AlertTriangle size={14} className="text-yellow-500 ml-1" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{item.volumeVendido.toLocaleString('pt-BR')}</td>
                                    <td className={`px-6 py-3 text-right font-medium ${item.margemLiquidaL < 0.2 ? 'text-yellow-600' : 'text-green-600'}`}>
                                        R$ {item.margemLiquidaL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">R$ {item.lucroTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-3 px-10">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, backgroundColor: item.cor }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 w-8">{Math.max(0, share).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RankingLucratividade;
