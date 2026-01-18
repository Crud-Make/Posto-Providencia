import React from 'react';
import { DollarSign, FileText } from 'lucide-react';
import { ExpenseData } from '../types';

interface ListaDespesasProps {
    expenses: ExpenseData[];
    totalDespesas: number;
    fmtMoney: (val: number) => string;
}

const ListaDespesas: React.FC<ListaDespesasProps> = ({ expenses, totalDespesas, fmtMoney }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <DollarSign size={18} className="text-red-500" />
                    Despesas do Dia
                </h3>
                <span className="text-xs font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-lg">
                    {fmtMoney(totalDespesas)}
                </span>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
                {expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <FileText size={48} className="opacity-10 mb-2" />
                        <p className="text-sm">Nenhuma despesa registrada</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map((expense) => (
                            <div key={expense.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center hover:shadow-sm transition-shadow">
                                <div className="min-w-0 pr-2">
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{expense.descricao}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">{expense.categoria}</div>
                                </div>
                                <div className="text-sm font-black text-red-500 whitespace-nowrap">
                                    - {fmtMoney(expense.valor)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListaDespesas;
