// [10/01 17:46] Criado durante refatoração Issue #16
import React from 'react';
import { Sliders } from 'lucide-react';
import { ParametrosFechamentoProps } from '../types';

/**
 * Componente para configuração de parâmetros de fechamento.
 * Exibe campos para tolerância de divergência.
 * 
 * @param {ParametrosFechamentoProps} props - Props do componente
 * @returns {JSX.Element} Componente renderizado
 */
export const ParametrosFechamento: React.FC<ParametrosFechamentoProps> = ({ 
    tolerance, 
    onChange,
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
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Sliders size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        Parâmetros do Fechamento
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                        Regras para a validação do caixa.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                        Tolerância de Divergência (R$)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Valor máximo aceito sem alerta crítico.
                    </p>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                            R$
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            value={tolerance}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
