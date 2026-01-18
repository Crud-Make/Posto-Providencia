import React from 'react';
import { TrendingUp } from 'lucide-react';
import { InputFinanceiro } from './InputFinanceiro';
import { CombustivelHibrido } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais } from '../../utils/formatters';

/**
 * Propriedades do componente SecaoVendas.
 */
interface Props {
   /** Lista de combustíveis para exibição */
   combustiveis: CombustivelHibrido[];
   /** Função para atualizar o estado de um combustível */
   updateCombustivel: (id: number, field: keyof CombustivelHibrido, value: string) => void;
   /** Objeto contendo funções de cálculos financeiros */
   calculos: CalculosRegistro;
   /** Totais consolidados para exibição no rodapé */
   totais: CalculosRegistro['totais'];
}

const TABLE_INPUT_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm bg-white dark:bg-gray-700 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-600";

/**
 * Componente que exibe a seção de Vendas (Leituras) na tela de registro de compras.
 * Permite a entrada de leituras iniciais e finais e exibe cálculos de lucro e margem.
 */
export const SecaoVendas: React.FC<Props> = ({ combustiveis, updateCombustivel, calculos, totais }) => {
   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
         <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <TrendingUp className="text-white" size={24} />
               <h2 className="text-white font-semibold text-lg">Vendas (Leituras)</h2>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 dark:bg-gray-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <tr>
                     <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                     <th className="px-4 py-4 text-center">Inicial</th>
                     <th className="px-4 py-4 text-center">Fechamento</th>
                     <th className="px-4 py-4 text-right">Litros</th>
                     <th className="px-4 py-4 text-right text-emerald-600">Preço Atual R$</th>
                     <th className="px-4 py-4 text-right text-blue-600">Valor p/ Bico</th>
                     <th className="px-4 py-4 text-right text-amber-600">Lucro LT R$</th>
                     <th className="px-4 py-4 text-right text-amber-600">Lucro Bico R$</th>
                     <th className="px-4 py-4 text-right">Margem %</th>
                     <th className="px-4 py-4 text-right">Prod. Vendido</th>
                     <th className="px-4 py-4 text-right">Produto %</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {combustiveis.map((c) => {
                     const litros = calculos.calcLitrosVendidos(c);
                     const valorBico = calculos.calcValorPorBico(c);
                     const lucroLt = calculos.calcLucroLt(c);
                     const lucroBico = calculos.calcLucroBico(c);
                     const margemPct = calculos.calcMargemPct(c);
                     const produtoPct = calculos.calcProdutoPct(c);

                     return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                           <td className="px-4 py-5 font-medium text-slate-900 dark:text-white">
                              <div className="flex flex-col">
                                 <span className="text-base">{c.nome}</span>
                                 <span className="text-xs text-slate-500 font-mono mt-1">{c.codigo}</span>
                              </div>
                           </td>
                           <td className="px-3 py-5 min-w-[140px]">
                              <InputFinanceiro
                                 value={c.inicial}
                                 onChangeValue={(v) => updateCombustivel(c.id, 'inicial', v)}
                                 className={TABLE_INPUT_CLASS}
                                 placeholder="0,000"
                              />
                           </td>
                           <td className="px-3 py-5 min-w-[140px]">
                              <InputFinanceiro
                                 value={c.fechamento}
                                 onChangeValue={(v) => updateCombustivel(c.id, 'fechamento', v)}
                                 className={TABLE_INPUT_CLASS}
                                 placeholder="0,000"
                              />
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30">
                              {litros > 0 ? formatarParaBR(litros, 0) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-medium text-emerald-600">
                              {c.preco_venda_atual}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10">
                              {valorBico !== 0 ? paraReais(valorBico) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right text-amber-600">
                              {lucroLt !== 0 ? paraReais(lucroLt) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/10">
                              {lucroBico !== 0 ? paraReais(lucroBico) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right text-red-400">
                              {margemPct !== 0 ? `${formatarParaBR(margemPct)}% ` : '-'}
                           </td>
                           <td className="px-4 py-5 text-right">
                              {litros > 0 ? formatarParaBR(litros, 0) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-bold">
                              {produtoPct > 0 ? `${formatarParaBR(produtoPct)}% ` : '-'}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
               <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                  <tr>
                     <td className="px-4 py-3 flex items-center gap-1">Total e Média</td>
                     <td className="px-4 py-3 text-center text-slate-400">-</td>
                     <td className="px-4 py-3 text-center text-slate-400">-</td>
                     <td className="px-4 py-3 text-right">{formatarParaBR(totais.totalLitros, 0)}</td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                     <td className="px-4 py-3 text-right bg-blue-900">{paraReais(totais.totalValorBico)}</td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                     <td className="px-4 py-3 text-right bg-amber-700">{paraReais(totais.totalLucroBico)}</td>
                     <td className="px-4 py-3 text-right bg-slate-700">{formatarParaBR(totais.margemMedia)}%</td>
                     <td className="px-4 py-3 text-right">{formatarParaBR(totais.totalLitros, 0)}</td>
                     <td className="px-4 py-3 text-right">100,00%</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </section>
   );
};

