import React from 'react';
import { CreditCard, Smartphone } from 'lucide-react';
import { PaymentEntry, FrentistaSession } from './types';
import { parseValue, getPaymentIcon, getPaymentLabel, formatSimpleValue } from './utils';

interface FechamentoFinanceiroProps {
   activeTab: 'leituras' | 'financeiro';
   diferenca: number;
   payments: PaymentEntry[];
   handlePaymentChange: (index: number, value: string) => void;
   frentistaSessions: FrentistaSession[];
   frentistasTotals: { total: number };
   totalPayments: number;
   totalTaxas: number;
   totalLiquido: number;
}

export const FechamentoFinanceiro: React.FC<FechamentoFinanceiroProps> = ({
   activeTab,
   diferenca,
   payments,
   handlePaymentChange,
   frentistaSessions,
   frentistasTotals,
   totalPayments,
   totalTaxas,
   totalLiquido
}) => {
   return (
      <div className={activeTab === 'financeiro' ? 'contents' : 'hidden'}>
         {/* Global Payment Recording (Stage 2) */}
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={20} className="text-gray-600 dark:text-gray-400" />
                  Fechamento Financeiro (Totais do Dia)
               </h2>
               <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-black text-gray-400 uppercase">Diferença Global</span>
                     <span className={`text-sm font-black ${Math.abs(diferenca) < 0.01 ? 'text-gray-400' : (diferenca >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
                        {diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </span>
                  </div>
               </div>
            </div>

            <div className="p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {payments.map((payment, index) => (
                     <div key={payment.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:border-blue-100 dark:hover:border-blue-800 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                              {getPaymentIcon(payment.tipo)}
                           </div>
                           <div>
                              <p className="text-xs font-black text-gray-400 uppercase leading-none">{getPaymentLabel(payment.tipo)}</p>
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">{payment.nome}</p>
                           </div>
                        </div>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                           <input
                              type="text"
                              value={payment.valor}
                              onChange={(e) => handlePaymentChange(index, e.target.value)}
                              placeholder="0,00"
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-base font-black text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/50 outline-none transition-all"
                           />
                        </div>
                        {payment.taxa > 0 && (
                           <div className="mt-2 flex justify-between items-center text-[10px]">
                              <span className="text-gray-400 font-bold uppercase tracking-tighter">Taxa: {payment.taxa}%</span>
                              <span className="text-gray-500 dark:text-gray-400 font-mono">
                                 - {(parseValue(payment.valor) * (payment.taxa / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               {/* Payment Summary Footer */}
               <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-8">
                  {/* Indicador de valores dos frentistas (mobile) */}
                  {frentistaSessions.length > 0 && (
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                           <Smartphone size={10} />
                           Total Frentistas (App)
                        </span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                           {frentistasTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                  )}
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bruto Informado</span>
                     <span className="text-xl font-black text-gray-900 dark:text-white">
                        {totalPayments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Taxas</span>
                     <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                        - {totalTaxas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Líquido Estimado</span>
                     <span className="text-xl font-black text-green-600 dark:text-green-400">
                        {totalLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </span>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
