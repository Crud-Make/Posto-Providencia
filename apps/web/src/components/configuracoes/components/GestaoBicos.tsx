// [10/01 17:46] Criado durante refatoração Issue #16
import React from 'react';
import { Fuel, Plus, Edit2, Trash2 } from 'lucide-react';
import { GestaoBicosProps } from '../types';

/**
 * Componente para gestão de bicos.
 * Exibe lista de bicos e permite adicionar/editar/remover.
 * 
 * @param {GestaoBicosProps} props - Props do componente
 * @returns {JSX.Element} Componente renderizado
 */
export const GestaoBicos: React.FC<GestaoBicosProps> = ({ nozzles }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Fuel
                            className="text-blue-600 dark:text-blue-500"
                            size={24}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                            <div className="size-2 bg-green-500 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Gestão de Bicos
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Associe bicos aos tanques e produtos.
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    <Plus size={14} /> ADICIONAR
                </button>
            </div>
            <div className="overflow-x-auto">
                {nozzles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum bico configurado.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Nº do Bico</th>
                                <th className="px-6 py-4">Produto Vinculado</th>
                                <th className="px-6 py-4">Tanque de Origem</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {nozzles.map((nozzle) => (
                                <tr
                                    key={nozzle.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-700 dark:text-gray-200">
                                            {nozzle.number}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                                        {nozzle.productName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {nozzle.tankSource}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                                            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
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
