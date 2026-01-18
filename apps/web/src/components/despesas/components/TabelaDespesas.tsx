import React from 'react';
import { Tag, CheckCircle2, Clock, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { Despesa } from '../types';

interface TabelaDespesasProps {
    loading: boolean;
    expenses: Despesa[];
    formatCurrency: (value: number) => string;
    onToggleStatus: (expense: Despesa) => void;
    onEdit: (expense: Despesa) => void;
    onDelete: (id: string) => void;
}

const TabelaDespesas: React.FC<TabelaDespesasProps> = ({
    loading,
    expenses,
    formatCurrency,
    onToggleStatus,
    onEdit,
    onDelete
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[500px]">
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                        <p className="text-gray-500">Carregando despesas...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FileText size={64} className="opacity-10 mb-4" />
                        <p className="text-lg font-medium">Nenhuma despesa encontrada</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                                {new Date(expense.data).toLocaleDateString('pt-BR')}
                                            </span>
                                            {expense.data_pagamento && (
                                                <span className="text-[10px] text-green-500 font-medium">
                                                    Pago em {new Date(expense.data_pagamento).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{expense.descricao}</span>
                                            {expense.observacoes && (
                                                <span className="text-xs text-gray-500 truncate max-w-xs">{expense.observacoes}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            <Tag size={12} />
                                            {expense.categoria}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-black text-gray-900 dark:text-gray-100">
                                            {formatCurrency(expense.valor)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => onToggleStatus(expense)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${expense.status === 'pago'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                            {expense.status === 'pago' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(expense)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(expense.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TabelaDespesas;
