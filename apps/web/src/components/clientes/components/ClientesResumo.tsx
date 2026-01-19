import React from 'react';
import { User, AlertTriangle, DollarSign } from 'lucide-react';
import { ClientesResumoProps } from '../types';

/**
 * Componente de resumo de clientes.
 * Exibe cards com total de clientes, devedores e valor a receber.
 */
export const ClientesResumo: React.FC<ClientesResumoProps> = ({
    resumo,
    loading
}) => {
    if (loading) {
        return <div className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                        <User size={20} />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Total de Clientes</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {resumo.totalClientes}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                        <AlertTriangle size={20} />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Clientes Devedores</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {resumo.totalDevedores}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                        <DollarSign size={20} />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Total a Receber</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {resumo.valorTotalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>
        </div>
    );
};
