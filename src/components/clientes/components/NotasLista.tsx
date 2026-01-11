import React from 'react';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { NotasListaProps } from '../types';

/**
 * Componente de listagem de notas.
 * Exibe tabela de notas com status e ações.
 */
export const NotasLista: React.FC<NotasListaProps> = ({
    notas,
    loading,
    onPagamento
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (notas.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 m-6">
                <DollarSign className="mx-auto mb-3 opacity-20" size={48} />
                <p>Nenhuma nota encontrada para este cliente.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Frentista</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notas.map((nota) => (
                        <tr key={nota.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                {new Date(nota.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                {nota.descricao || '-'}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                {nota.frentista?.nome || '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                {nota.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {nota.status === 'pago' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                        <CheckCircle size={12} />
                                        Pago
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                        <XCircle size={12} />
                                        Pendente
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {nota.status !== 'pago' && (
                                    <button
                                        onClick={() => onPagamento(nota.id)}
                                        className="text-green-600 hover:text-green-700 font-medium text-xs bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Baixar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
