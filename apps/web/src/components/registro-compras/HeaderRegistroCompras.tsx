import React, { useState } from 'react';
import { FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { usePosto } from '../../contexts/PostoContext';

interface Props {
   onRefresh: () => void;
   loading: boolean;
}

export const HeaderRegistroCompras: React.FC<Props> = ({ onRefresh, loading }) => {
   const { postos, postoAtivo, setPostoAtivoById } = usePosto();
   const [postoDropdownOpen, setPostoDropdownOpen] = useState(false);

   return (
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
         <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 font-display uppercase tracking-wider">
               <FileText className="text-emerald-600" />
               Registro de Compras
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie compras, leituras e reconciliação de estoque</p>
         </div>

         <div className="flex items-center gap-4 mt-4 md:mt-0">
            {/* Seletor de Posto */}
            <div className="relative">
               <button
                  onClick={() => setPostoDropdownOpen(!postoDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
               >
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                     {postoAtivo?.nome || 'Selecione um Posto'}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
               </button>

               {postoDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50">
                     {postos.map(posto => (
                        <button
                           key={posto.id}
                           onClick={() => {
                              setPostoAtivoById(posto.id);
                              setPostoDropdownOpen(false);
                           }}
                           className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                           <div className="font-medium text-gray-800 dark:text-white">{posto.nome}</div>
                        </button>
                     ))}
                  </div>
               )}
            </div>

            <button
               onClick={onRefresh}
               disabled={loading}
               className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
               title="Recarregar dados"
            >
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
         </div>
      </div>
   );
};
