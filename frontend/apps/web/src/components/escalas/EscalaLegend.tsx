import React from 'react';
import { FileText, MousePointer2 } from 'lucide-react';

/**
 * Legenda visual para a tabela de escalas
 * 
 * @returns Elemento JSX com a legenda
 */
const EscalaLegend: React.FC = () => {
    return (
        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-xs shadow-sm">
                    F
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Folga Marcada</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center text-gray-300 dark:text-gray-600 font-black text-xs">
                    •
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Dia de Trabalho</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText size={16} />
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Possui Observação</span>
            </div>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 hidden md:block"></div>

            <div className="flex items-center gap-2 text-gray-500 italic text-xs">
                <MousePointer2 size={14} />
                <span>Clique para alternar folga | Clique direito para observação</span>
            </div>
        </div>
    );
};

export default EscalaLegend;
