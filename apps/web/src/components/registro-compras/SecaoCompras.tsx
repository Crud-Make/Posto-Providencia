import React from 'react';
import { Package } from 'lucide-react';
import { InputFinanceiro } from './InputFinanceiro';
import { CombustivelHibrido } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais } from '../../utils/formatters';
import { Database } from '../../types/database/index';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

interface Props {
   combustiveis: CombustivelHibrido[];
   updateCombustivel: (id: number, field: keyof CombustivelHibrido, value: string) => void;
   calculos: CalculosRegistro;
   totais: CalculosRegistro['totais'];
   despesasMes: string;
   setDespesasMes: (v: string) => void;
   saving: boolean;
   onSave: () => void;
   fornecedores: Fornecedor[];
   fornecedorSelecionado: number | null;
   setFornecedorSelecionado: (id: number | null) => void;
}

const TABLE_INPUT_ORANGE_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm bg-white dark:bg-gray-700 dark:text-white hover:border-orange-300 dark:hover:border-orange-600";

export const SecaoCompras: React.FC<Props> = ({
   combustiveis, updateCombustivel, calculos, totais,
   despesasMes, setDespesasMes, saving, onSave,
   fornecedores, fornecedorSelecionado, setFornecedorSelecionado
}) => {
   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
         <div className="bg-orange-600 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
               <Package className="text-white" size={24} />
               <h2 className="text-white font-semibold text-lg">Compra e Custo</h2>
            </div>
            {/* Controles do Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">

               {/* Seletor de Fornecedor */}
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-orange-200 tracking-wider mb-1">Fornecedor</span>
                  <select
                     value={fornecedorSelecionado || ''}
                     onChange={(e) => setFornecedorSelecionado(Number(e.target.value) || null)}
                     className="bg-white/10 border border-orange-400/30 rounded text-white text-sm focus:outline-none focus:bg-white/20 py-1 px-2 min-w-[150px]"
                  >
                     <option value="" className="text-gray-900">Selecione...</option>
                     {fornecedores.map(f => (
                        <option key={f.id} value={f.id} className="text-gray-900">
                           {f.nome}
                        </option>
                     ))}
                  </select>
               </div>

               {/* Campo Despesas do Mês - planilha H19:=D390 */}
               <div className="flex items-center gap-3 bg-orange-700/50 rounded-lg px-4 py-2">
                  <div className="flex flex-col">
                     <span className="text-[10px] uppercase font-bold text-orange-200 tracking-wider">Despesas do Mês (R$)</span>
                     <span className="text-[9px] text-orange-300">Rateado por litro vendido</span>
                  </div>
                  <div className="relative">
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-300 text-sm font-bold">R$</span>
                     <InputFinanceiro
                        value={despesasMes}
                        onChangeValue={setDespesasMes}
                        className="w-32 pl-8 pr-2 py-1 bg-white/10 border border-orange-400/30 rounded text-white placeholder-orange-300/50 focus:outline-none focus:bg-white/20 text-right text-sm font-bold"
                        placeholder="0,00"
                     />
                  </div>
               </div>

               <button
                  onClick={onSave}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  {saving ? 'Salvando...' : 'FINALIZAR COMPRA'}
               </button>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 dark:bg-gray-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <tr className="bg-slate-200 dark:bg-gray-600 border-b border-slate-300 dark:border-gray-500">
                     <th className="px-4 py-2 bg-slate-100 dark:bg-gray-700"></th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-orange-700 dark:text-orange-400" colSpan={2}>Compra</th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-blue-700 dark:text-blue-400" colSpan={1}>Custo</th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-emerald-700 dark:text-emerald-400" colSpan={1}>Venda</th>
                  </tr>
                  <tr>
                     <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                     <th className="px-4 py-4 text-center border-l border-slate-200 dark:border-gray-600">Compra, LT.</th>
                     <th className="px-4 py-4 text-center">Compra, R$.</th>
                     <th className="px-4 py-4 text-right text-blue-600">Média LT R$</th>
                     <th className="px-4 py-4 text-right border-l border-slate-200 text-emerald-600">Valor P/ Venda</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {combustiveis.map((c) => {
                     const mediaLt = calculos.calcMediaLtRs(c);
                     const valorVenda = calculos.calcValorParaVenda(c);
                     return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                           <td className="px-4 py-5 font-medium text-slate-900 dark:text-white">
                              <div className="flex flex-col">
                                 <span className="text-base">{c.nome}</span>
                                 <span className="text-xs text-slate-500 font-mono mt-1">{c.codigo}</span>
                              </div>
                           </td>
                           <td className="px-3 py-5 min-w-[140px] border-l border-slate-100 dark:border-gray-700">
                              <InputFinanceiro
                                 value={c.compra_lt}
                                 onChangeValue={(v) => updateCombustivel(c.id, 'compra_lt', v)}
                                 className={TABLE_INPUT_ORANGE_CLASS}
                                 placeholder="0,000"
                              />
                           </td>
                           <td className="px-3 py-5 min-w-[140px]">
                              <InputFinanceiro
                                 value={c.compra_rs}
                                 onChangeValue={(v) => updateCombustivel(c.id, 'compra_rs', v)}
                                 className={TABLE_INPUT_ORANGE_CLASS}
                                 placeholder="0,00"
                              />
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10">
                              {mediaLt !== 0 ? paraReais(mediaLt) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-l border-slate-100 dark:border-gray-700">
                              {valorVenda !== 0 ? paraReais(valorVenda) : '-'}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                  <tr>
                     <td className="px-4 py-3 flex items-center gap-1">Total</td>
                     <td className="px-4 py-3 text-right bg-orange-900 text-orange-200">
                        {formatarParaBR(totais.totalCompraLt, 0)}
                     </td>
                     <td className="px-4 py-3 text-right bg-orange-900 text-orange-200">
                        {paraReais(totais.totalCompraRs)}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900">
                        {paraReais(totais.mediaTotal)}
                     </td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </section>
   );
};
