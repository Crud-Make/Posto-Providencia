import React from 'react';
import { DollarSign } from 'lucide-react';
import { InputFinanceiro } from './InputFinanceiro';
import { CombustivelHibrido } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais, analisarValor } from '../../utils/formatters';

interface Props {
   combustiveis: CombustivelHibrido[];
   updateCombustivel: (id: number, field: keyof CombustivelHibrido, value: string) => void;
   calculos: CalculosRegistro;
   totais: CalculosRegistro['totais'];
}

const TABLE_INPUT_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm bg-white dark:bg-gray-700 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-600";

export const SecaoEstoque: React.FC<Props> = ({ combustiveis, updateCombustivel, calculos, totais }) => {
   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
         <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <DollarSign className="text-white" size={24} />
               <h2 className="text-white font-semibold text-lg">Reconciliação de Tanques</h2>
            </div>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 dark:bg-gray-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <tr>
                     <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                     <th className="px-4 py-4 text-right">Estoque Anterior</th>
                     <th className="px-4 py-4 text-right text-purple-600">Compra + Estoque</th>
                     <th className="px-4 py-4 text-right text-blue-600">Estoque Hoje</th>
                     <th className="px-4 py-4 text-right text-gray-500">Valor Estoque (R$)</th>
                     <th className="px-4 py-4 text-right text-green-600">Lucro Previsto (R$)</th>
                     <th className="px-4 py-4 text-center text-amber-600">Estoque Tanque</th>
                     <th className="px-4 py-4 text-right">Perca / Sobra</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {combustiveis.map((c) => {
                     const estoqueAnt = analisarValor(c.estoque_anterior);
                     const compraEstoque = calculos.calcCompraEEstoque(c);
                     const estoqueHoje = calculos.calcEstoqueHoje(c);
                     const mediaLt = calculos.calcMediaLtRs(c);
                     const lucroLt = calculos.calcLucroLt(c);
                     const percaSobra = calculos.calcPercaSobra(c);

                     return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                           <td className="px-4 py-5 font-medium text-slate-900 dark:text-white">
                              <div className="flex flex-col">
                                 <span className="text-base">{c.nome}</span>
                                 <span className="text-xs text-slate-500 font-mono mt-1">{c.codigo}</span>
                              </div>
                           </td>
                           <td className="px-4 py-5 text-right text-slate-500">
                              {formatarParaBR(estoqueAnt, 0)}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/10">
                              {formatarParaBR(compraEstoque, 0)}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10">
                              {formatarParaBR(estoqueHoje, 0)}
                           </td>
                           <td className="px-4 py-5 text-right text-gray-500">
                              {paraReais(estoqueHoje * mediaLt)}
                           </td>
                           <td className="px-4 py-5 text-right text-green-600 font-bold bg-green-50 dark:bg-green-900/10">
                              {paraReais(estoqueHoje * lucroLt)}
                           </td>
                           <td className="px-3 py-5 min-w-[150px]">
                              <InputFinanceiro
                                 value={c.estoque_tanque}
                                 onChangeValue={(v) => updateCombustivel(c.id, 'estoque_tanque', v)}
                                 className={TABLE_INPUT_CLASS}
                                 placeholder="0,000"
                              />
                           </td>
                           <td className="px-4 py-5 text-right font-bold">
                              {percaSobra !== 0 ? (
                                 <span className={`flex flex-col ${percaSobra > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    <span>{percaSobra > 0 ? '+' : ''}{formatarParaBR(percaSobra, 0)}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-wider">
                                       {percaSobra > 0 ? 'SOBRA' : 'PERCA'}
                                    </span>
                                 </span>
                              ) : '-'}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                  <tr>
                     <td className="px-4 py-3 flex items-center gap-1">Total</td>
                     <td className="px-4 py-3 text-right">
                        {formatarParaBR(combustiveis.reduce((acc, c) => acc + analisarValor(c.estoque_anterior), 0), 0)}
                     </td>
                     <td className="px-4 py-3 text-right bg-purple-900">
                        {formatarParaBR(combustiveis.reduce((acc, c) => acc + calculos.calcCompraEEstoque(c), 0), 0)}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900">
                        {formatarParaBR(combustiveis.reduce((acc, c) => acc + calculos.calcEstoqueHoje(c), 0), 0)}
                     </td>
                     <td className="px-4 py-3 text-right bg-gray-700">
                        {paraReais(totais.totalCustoEstoque)}
                     </td>
                     <td className="px-4 py-3 text-right bg-green-800">
                        {paraReais(totais.totalLucroEstoque)}
                     </td>
                     <td className="px-4 py-3 text-center">
                        {formatarParaBR(combustiveis.reduce((acc, c) => acc + analisarValor(c.estoque_tanque), 0), 0)}
                     </td>
                     <td className="px-4 py-3 text-right">
                        {(() => {
                           const totalPercaSobra = totais.totalPercaSobra;
                           return totalPercaSobra !== 0 ? (
                              <span className={totalPercaSobra > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                 {totalPercaSobra > 0 ? '+' : ''}{formatarParaBR(totalPercaSobra, 0)}
                              </span>
                           ) : '-';
                        })()}
                     </td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </section>
   );
};
