import React from 'react';
import { User, RefreshCw, X, Smartphone, CreditCard, FileText, Banknote, ShoppingBag } from 'lucide-react';
import { FrentistaSession } from './types';
import { formatSimpleValue, formatValueOnBlur, parseValue } from './utils';
import { Frentista } from '../../services/database.types';

interface FechamentoFrentistasTableProps {
   frentistas: Frentista[];
   frentistaSessions: FrentistaSession[];
   updateFrentistaSession: (tempId: string, updates: Partial<FrentistaSession>) => void;
   handleRemoveFrentista: (tempId: string) => void;
   frentistasTotals: { total: number };
   handleSave: () => void;
   loadData: () => void;
   loadFrentistaSessions: () => void;
   activeTab: 'leituras' | 'financeiro';
}

export const FechamentoFrentistasTable: React.FC<FechamentoFrentistasTableProps> = ({
   frentistas,
   frentistaSessions,
   updateFrentistaSession,
   handleRemoveFrentista,
   frentistasTotals,
   handleSave,
   loadData,
   loadFrentistaSessions,
   activeTab
}) => {
   return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:break-inside-avoid ${activeTab === 'financeiro' ? 'hidden' : ''}`}>
         <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Detalhamento por Frentista
               </h2>
               <div className="flex gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                     {frentistaSessions.length} Ativos
                  </span>
               </div>
            </div>
            <div className="flex gap-2">
               <button
                  onClick={() => {
                     loadData();
                     loadFrentistaSessions();
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                  title="Atualizar dados"
               >
                  <RefreshCw size={18} />
               </button>

            </div>
         </div>


         <div className="overflow-x-auto custom-scrollbar flex-grow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
               <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                     <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Meio de Pagamento
                     </th>
                     {frentistaSessions.map((session, idx) => {
                        const frentista = frentistas.find(f => f.id === session.frentistaId);
                        return (
                           <th key={session.tempId} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                              <div className="flex items-center justify-end gap-2 group">
                                 {frentista ? (
                                    <span>{frentista.nome.split(' ')[0]}</span>
                                 ) : (
                                    <select
                                       value={session.frentistaId || ''}
                                       onChange={(e) => updateFrentistaSession(session.tempId, { frentistaId: Number(e.target.value) })}
                                       className="text-xs p-1 border rounded bg-white dark:bg-gray-700 dark:text-white"
                                    >
                                       <option value="">Selecione...</option>
                                       {frentistas.map(f => (
                                          <option key={f.id} value={f.id}>{f.nome.split(' ')[0]}</option>
                                       ))}
                                    </select>
                                 )}
                                 <button
                                    onClick={() => handleRemoveFrentista(session.tempId)}
                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover coluna"
                                 >
                                    <X size={14} />
                                 </button>
                              </div>
                           </th>
                        );
                     })}
                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        Total Caixa
                     </th>
                  </tr>
               </thead>
               <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* PIX */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <Smartphone className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Pix
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_pix}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_pix: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_pix: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_pix), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Cartão Débito */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <CreditCard className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Cartão Débito
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_cartao_debito}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_cartao_debito: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_cartao_debito: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_cartao_debito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Cartão Crédito */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <CreditCard className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Cartão Crédito
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_cartao_credito}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_cartao_credito: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_cartao_credito: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_cartao_credito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Notas a Prazo */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <FileText className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Notas a Prazo
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_nota}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_nota: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_nota: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_nota), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Dinheiro */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <Banknote className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Dinheiro
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_dinheiro}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_dinheiro: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_dinheiro: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_dinheiro), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Baratão (Optional/Others) */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center">
                           <ShoppingBag className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                           Baratão/Outros
                        </div>
                     </td>
                     {frentistaSessions.map(session => (
                        <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                           <input
                              type="text"
                              value={session.valor_baratao}
                              onChange={(e) => updateFrentistaSession(session.tempId, { valor_baratao: formatSimpleValue(e.target.value) })}
                              onBlur={(e) => updateFrentistaSession(session.tempId, { valor_baratao: formatValueOnBlur(e.target.value) })}
                              className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                              placeholder="R$ 0,00"
                           />
                        </td>
                     ))}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_baratao), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Total Venda Frentista (Sum Row) */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                     <td className="sticky left-0 z-10 bg-blue-50 dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-blue-100 border-r border-blue-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Total Venda Frentista
                     </td>
                     {frentistaSessions.map(session => {
                        const total = parseValue(session.valor_cartao_debito) +
                           parseValue(session.valor_cartao_credito) +
                           parseValue(session.valor_pix) +
                           parseValue(session.valor_nota) +
                           parseValue(session.valor_dinheiro) +
                           parseValue(session.valor_baratao);
                        return (
                           <td key={session.tempId} className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </td>
                        );
                     })}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-700 dark:text-blue-300 border-l border-blue-100 dark:border-gray-700 bg-blue-100/50 dark:bg-blue-900/40">
                        {frentistasTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </td>
                  </tr>

                  {/* Falta/Diferença */}
                  <tr className="bg-red-50 dark:bg-red-900/10">
                     <td className="sticky left-0 z-10 bg-red-50 dark:bg-gray-800 px-6 py-3 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400 border-r border-red-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Diferença (Falta)
                     </td>
                     {frentistaSessions.map(session => {
                        const totalInf = parseValue(session.valor_cartao_debito) +
                           parseValue(session.valor_cartao_credito) +
                           parseValue(session.valor_pix) +
                           parseValue(session.valor_nota) +
                           parseValue(session.valor_dinheiro) +
                           parseValue(session.valor_baratao);
                        const totalVendido = parseValue(session.valor_encerrante);
                        const diff = totalVendido - totalInf;

                        return (
                           <td key={session.tempId} className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold">
                              <span className={`${diff > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                 {diff > 0.01 ? diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                              </span>
                           </td>
                        );
                     })}
                     <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600 border-l border-red-100 dark:border-gray-700 bg-red-100/30 dark:bg-red-900/30">
                        {(() => {
                           const totalFalta = frentistaSessions.reduce((acc, s) => {
                              const totalInf = parseValue(s.valor_cartao_debito) + parseValue(s.valor_cartao_credito) + parseValue(s.valor_pix) + parseValue(s.valor_nota) + parseValue(s.valor_dinheiro) + parseValue(s.valor_baratao);
                              const totalVendido = parseValue(s.valor_encerrante);
                              const diff = totalVendido - totalInf;
                              return acc + (diff > 0 ? diff : 0);
                           }, 0);
                           return totalFalta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        })()}
                     </td>
                  </tr>

                  {/* Percentual */}
                  <tr>
                     <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Participação %
                     </td>
                     {frentistaSessions.map(session => {
                        const totalInf = parseValue(session.valor_cartao_debito) +
                           parseValue(session.valor_cartao_credito) +
                           parseValue(session.valor_pix) +
                           parseValue(session.valor_nota) +
                           parseValue(session.valor_dinheiro) +
                           parseValue(session.valor_baratao);
                        const globalTotal = frentistasTotals.total || 1;
                        const percent = (totalInf / globalTotal) * 100;

                        return (
                           <td key={session.tempId} className="px-6 py-3 whitespace-nowrap text-xs text-right text-gray-500 dark:text-gray-400">
                              {percent.toFixed(2)}%
                           </td>
                        );
                     })}
                     <td className="px-6 py-3 whitespace-nowrap text-xs text-right font-semibold text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        100%
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>


         <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left flex justify-between items-center">
               <span>* Valores de Venda Concentrador devem ser preenchidos com o total vendido registrado na bomba (Encerrante).</span>
               {frentistaSessions.length > 0 && (
                  <button
                     onClick={() => {
                        handleSave();
                     }}
                     className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                     Salvar Alterações
                  </button>
               )}
            </div>
         </div>
      </div>
   );
};
