import React from 'react';
import { BarChart2 } from 'lucide-react';
import { ShiftData, DailyTotals } from '../types';

interface TabelaDetalhamentoProps {
    shiftsData: ShiftData[];
    totals: DailyTotals;
    fmtMoney: (val: number) => string;
    fmtLitros: (val: number) => string;
}

const TabelaDetalhamento: React.FC<TabelaDetalhamentoProps> = ({
    shiftsData,
    totals,
    fmtMoney,
    fmtLitros
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart2 size={20} className="text-blue-600" />
                    Detalhamento do Dia
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Turno</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Vendas</th>
                            <th className="px-6 py-4 text-right">Volume</th>
                            <th className="px-6 py-4 text-right">Lucro Est.</th>
                            <th className="px-6 py-4 text-right">Quebra/Sobra</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {shiftsData.map((shift) => (
                            <tr key={shift.turnoId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                    {shift.turnoName}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${shift.status === 'Fechado'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : shift.status === 'Pendente'
                                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        }`}>
                                        {shift.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                    {fmtMoney(shift.vendas)}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 font-medium">
                                    {fmtLitros(shift.litros)}
                                </td>
                                <td className="px-6 py-4 text-right font-black text-green-600 dark:text-green-400">
                                    {fmtMoney(shift.lucro)}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${shift.diferenca < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                    {fmtMoney(shift.diferenca)}
                                </td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-gray-50 dark:bg-gray-900/50 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-700">
                            <td className="px-6 py-4">TOTAL ACUMULADO</td>
                            <td className="px-6 py-4"></td>
                            <td className="px-6 py-4 text-right">{fmtMoney(totals.vendas)}</td>
                            <td className="px-6 py-4 text-right">{fmtLitros(totals.litros)}</td>
                            <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{fmtMoney(totals.lucro)}</td>
                            <td className={`px-6 py-4 text-right ${totals.diferenca < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                {fmtMoney(totals.diferenca)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TabelaDetalhamento;
