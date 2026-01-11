// [10/01 17:46] Criado durante refatoração Issue #16
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ParametrosEstoqueProps } from '../types';

/**
 * Componente para configuração de alertas de estoque.
 * Exibe campos para dias de estoque crítico e baixo.
 * 
 * @param {ParametrosEstoqueProps} props - Props do componente
 * @returns {JSX.Element} Componente renderizado
 */
export const ParametrosEstoque: React.FC<ParametrosEstoqueProps> = ({ 
    diasCritico, 
    diasBaixo, 
    onChangeCritico, 
    onChangeBaixo,
    saving,
    modified,
    onSave
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 relative">
            {modified && (
                <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Não salvo
                    </span>
                </div>
            )}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        Alertas de Estoque
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                        Defina os limites para alertas de estoque.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                        Dias para Estoque Crítico
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Quantidade de dias de estoque para disparar alerta crítico.
                    </p>
                    <input
                        type="number"
                        step="1"
                        min="1"
                        value={diasCritico}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeCritico(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                        Dias para Estoque Baixo
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Quantidade de dias de estoque para exibir alerta de atenção.
                    </p>
                    <input
                        type="number"
                        step="1"
                        min="1"
                        value={diasBaixo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeBaixo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};
