import React from 'react';
import { Fuel, Check, X, Pencil } from 'lucide-react';
import { BicoWithDetails } from './types';
import { FUEL_COLORS } from './constants';

interface FechamentoLeiturasTableProps {
   bicos: BicoWithDetails[];
   leituras: Record<number, { inicial: string; fechamento: string }>;
   handleInicialChange: (bicoId: number, value: string) => void;
   handleFechamentoChange: (bicoId: number, value: string) => void;
   handleInicialBlur: (bicoId: number) => void;
   handleFechamentoBlur: (bicoId: number) => void;
   calcLitros: (bicoId: number) => { value: number; display: string };
   calcVenda: (bicoId: number) => { value: number; display: string };
   isReadingValid: (bicoId: number) => boolean;
   editingPrice: number | null;
   setEditingPrice: (id: number | null) => void;
   tempPrice: string;
   setTempPrice: (val: string) => void;
   handleSavePrice: (id: number) => void;
   handleEditPrice: (id: number, price: number) => void;
   totals: { valorDisplay: string };
}

export const FechamentoLeiturasTable: React.FC<FechamentoLeiturasTableProps> = ({
   bicos,
   leituras,
   handleInicialChange,
   handleFechamentoChange,
   handleInicialBlur,
   handleFechamentoBlur,
   calcLitros,
   calcVenda,
   isReadingValid,
   editingPrice,
   setEditingPrice,
   tempPrice,
   setTempPrice,
   handleSavePrice,
   handleEditPrice,
   totals
}) => {
   return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
         <div className="px-6 py-4 border-b bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
               <Fuel size={20} className="text-blue-600" />
               Venda Concentrador
            </h2>
            <span className="lg:hidden text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse flex items-center gap-1">
               <div className="flex gap-0.5">
                  <span className="w-1 h-1 bg-blue-600 rounded-full opacity-40"></span>
                  <span className="w-1 h-1 bg-blue-600 rounded-full opacity-70"></span>
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
               </div>
               Deslize
            </span>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
               <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs uppercase font-bold text-gray-600 dark:text-gray-300">
                     <th className="px-4 py-3 text-left">Produtos</th>
                     <th className="px-4 py-3 text-right">Inicial</th>
                     <th className="px-4 py-3 text-right bg-yellow-50 dark:bg-yellow-900/20">Fechamento</th>
                     <th className="px-4 py-3 text-right">Litros (L)</th>
                     <th className="px-4 py-3 text-right">Valor LT $</th>
                     <th className="px-4 py-3 text-right">Venda bico R$</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bicos.map((bico) => {
                     const colors = FUEL_COLORS[bico.combustivel.codigo] || FUEL_COLORS['GC'];
                     const inicial = leituras[bico.id]?.inicial || '';
                     const fechamento = leituras[bico.id]?.fechamento || '';
                     const litrosData = calcLitros(bico.id);
                     const vendaData = calcVenda(bico.id);
                     const isValid = isReadingValid(bico.id);

                     return (
                        <tr key={bico.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                           {/* Produtos - Combustivel + Bico */}
                           <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                              {bico.combustivel.codigo}, Bico {bico.numero.toString().padStart(2, '0')}
                           </td>

                           {/* Inicial (INPUT) */}
                           <td className="px-4 py-3">
                              <input
                                 type="text"
                                 value={inicial}
                                 onChange={(e) => handleInicialChange(bico.id, e.target.value)}
                                 onBlur={() => handleInicialBlur(bico.id)}
                                 className="w-full text-right font-mono py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                                 placeholder="0,000"
                              />
                           </td>

                           {/* Fechamento (INPUT) */}
                           <td className="px-4 py-3 bg-yellow-50/50 dark:bg-yellow-900/10">
                              <input
                                 type="text"
                                 value={fechamento}
                                 onChange={(e) => handleFechamentoChange(bico.id, e.target.value)}
                                 onBlur={() => handleFechamentoBlur(bico.id)}
                                 className={`w-full text-right font-mono py-2 px-3 rounded-lg border outline-none
                                    ${fechamento && !isValid
                                       ? 'border-red-300 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                       : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100'}
                                    `}
                                 placeholder="0,000"
                              />
                           </td>

                           {/* Litros (CALCULADO - exibe "-" quando inválido) */}
                           <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                              {litrosData.display !== '-' ? `${litrosData.display} L` : '-'}
                           </td>

                           {/* Valor LT $ (EDITÁVEL - clique no lápis para alterar) */}
                           <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                              {editingPrice === bico.combustivel.id ? (
                                 <div className="flex items-center justify-end gap-1">
                                    <span className="text-xs text-gray-400">R$</span>
                                    <input
                                       type="text"
                                       value={tempPrice}
                                       onChange={(e) => setTempPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                                       onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSavePrice(bico.combustivel.id);
                                          if (e.key === 'Escape') setEditingPrice(null);
                                       }}
                                       className="w-16 text-right py-1 px-2 border border-blue-300 rounded text-sm font-mono bg-white dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-blue-200 outline-none"
                                       autoFocus
                                    />
                                    <button
                                       onClick={() => handleSavePrice(bico.combustivel.id)}
                                       className="p-1 text-green-600 hover:bg-green-50 rounded"
                                       title="Salvar"
                                    >
                                       <Check size={14} />
                                    </button>
                                    <button
                                       onClick={() => setEditingPrice(null)}
                                       className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                       title="Cancelar"
                                    >
                                       <X size={14} />
                                    </button>
                                 </div>
                              ) : (
                                 <div className="flex items-center justify-end gap-1 group">
                                    <span>R$ {bico.combustivel.preco_venda.toFixed(2).replace('.', ',')}</span>
                                    <button
                                       onClick={() => handleEditPrice(bico.combustivel.id, bico.combustivel.preco_venda)}
                                       className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                       title="Editar preço"
                                    >
                                       <Pencil size={12} />
                                    </button>
                                 </div>
                              )}
                           </td>

                           {/* Venda bico R$ (CALCULADO - exibe "-" quando litros = "-") */}
                           <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                              {vendaData.display}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>

               {/* TOTAL Row (EXATO como planilha - "RES X,XX") */}
               <tfoot>
                  <tr className="bg-gray-200 dark:bg-gray-700 font-black text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                     <td className="px-4 py-4">Total.</td>
                     <td className="px-4 py-4 text-right">-</td>
                     <td className="px-4 py-4 text-right">-</td>
                     <td className="px-4 py-4 text-right">-</td>
                     <td className="px-4 py-4 text-right">-</td>
                     <td className="px-4 py-4 text-right font-mono text-green-700 dark:text-green-400 text-lg">
                        RES {totals.valorDisplay}
                     </td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
   );
};
