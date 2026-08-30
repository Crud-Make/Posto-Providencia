import React from 'react';
import { Package, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputFinanceiro } from './InputFinanceiro';
import { corDoProduto } from './cores-planilha';
import { CombustivelHibrido, CampoDigitado } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais, parseBRFloat } from '../../utils/formatters';
import { Database } from '../../types/database/index';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

interface Props {
   combustiveis: CombustivelHibrido[];
   updateCombustivel: (id: number, field: CampoDigitado, value: string) => void;
   calculos: CalculosRegistro;
   totais: CalculosRegistro['totais'];
   saving: boolean;
   onSave: () => void;
   fornecedores: Fornecedor[];
   fornecedorSelecionado: number | null;
   setFornecedorSelecionado: (id: number | null) => void;
   /** Despesa do mês lida da tabela `Despesa`, em reais — a parcela rateada do "Valor P/ Venda". */
   despesaDoMes: number;
}

const TABLE_INPUT_ORANGE_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm bg-white dark:bg-gray-700 dark:text-white hover:border-orange-300 dark:hover:border-orange-600";

export const SecaoCompras: React.FC<Props> = ({
   combustiveis, updateCombustivel, calculos, totais,
   saving, onSave,
   fornecedores, fornecedorSelecionado, setFornecedorSelecionado,
   despesaDoMes
}) => {
   const navigate = useNavigate();
   const despesaPorLitro = calculos.calcDespesaPorLitro();
   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
         <div className="bg-orange-600 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
               <Package className="text-white" size={24} />
               <h2 className="text-white font-semibold text-lg">Compra e Custo</h2>
            </div>
            {/* Controles do Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">

               {/* Despesa do mês: só leitura aqui. Lançar é na aba "Receitas e Despesas"
                   do Fechamento — um lugar só para escrever, para o rateio nunca divergir. */}
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-orange-200 tracking-wider mb-1">Despesa do mês</span>
                  <button
                     type="button"
                     onClick={() => navigate('/fechamento?aba=receitas-despesas')}
                     title="Abre o Fechamento na aba Receitas e Despesas"
                     className="flex items-center gap-2 bg-white/10 border border-orange-400/30 rounded text-white text-sm py-1 px-2 hover:bg-white/20 transition-colors"
                  >
                     <Receipt size={14} />
                     <span className="font-semibold">{despesaDoMes > 0 ? paraReais(despesaDoMes) : 'nenhuma'}</span>
                     {despesaPorLitro > 0 && (
                        <span className="text-orange-100 text-xs" title="Despesa do mês ÷ litros vendidos no mês">
                           = {paraReais(despesaPorLitro)}/L
                        </span>
                     )}
                     <span className="text-orange-200 text-xs">· lançar</span>
                  </button>
               </div>

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


               <button
                  onClick={onSave}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  {saving ? 'Salvando...' : 'FINALIZAR COMPRA'}
               </button>
            </div>
         </div>
         {/* De onde vem o preço do litro — a mesma decomposição que a planilha faz
             em "Valor pra Venda" e "Lucro,LT": custo de compra + despesa rateada
             = custo do litro; preço de bomba − custo do litro = sobra. Veio do
             gráfico "Visão do Período", que saiu: aqui a conta fica ao lado do
             número que ela explica, produto a produto. */}
         <p className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30">
            <span className="font-semibold text-orange-700 dark:text-orange-300">De onde vem o preço do litro:</span>{' '}
            custo de compra (média do mês) <span className="font-mono">+</span> despesa rateada por litro{' '}
            <span className="font-mono">=</span> custo do litro. O que a bomba cobra acima disso é a{' '}
            <span className="font-semibold text-green-600">sobra</span>; abaixo, está{' '}
            <span className="font-semibold text-red-600">abaixo do custo</span>.
         </p>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 dark:bg-gray-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <tr className="bg-slate-200 dark:bg-gray-600 border-b border-slate-300 dark:border-gray-500">
                     <th className="px-4 py-2 bg-slate-100 dark:bg-gray-700"></th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-orange-700 dark:text-orange-400" colSpan={2}>Compra</th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-blue-700 dark:text-blue-400" colSpan={3}>Custo do litro</th>
                     <th className="px-4 py-2 text-center border-l border-slate-300 dark:border-gray-500 text-emerald-700 dark:text-emerald-400" colSpan={2}>Venda</th>
                  </tr>
                  <tr>
                     <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                     <th className="px-4 py-4 text-center border-l border-slate-200 dark:border-gray-600">Compra, LT.</th>
                     <th className="px-4 py-4 text-center">Compra, R$.</th>
                     <th className="px-4 py-4 text-right border-l border-slate-200 dark:border-gray-600 text-blue-600">Média LT R$</th>
                     <th className="px-4 py-4 text-right text-blue-600">+ Despesa/L</th>
                     <th className="px-4 py-4 text-right text-blue-700 dark:text-blue-300">= Custo do litro</th>
                     <th className="px-4 py-4 text-right border-l border-slate-200 dark:border-gray-600 text-emerald-600">Preço de bomba</th>
                     <th className="px-4 py-4 text-right">Sobra por litro</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {combustiveis.map((c) => {
                     const mediaLt = calculos.calcMediaLtRs(c);
                     const valorVenda = calculos.calcValorParaVenda(c);
                     const precoBomba = parseBRFloat(c.preco_venda_atual);
                     const sobraLt = calculos.calcLucroLt(c);
                     return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                           <td className="px-4 py-5 font-medium text-slate-900 dark:text-white border-l-8" style={{ borderLeftColor: corDoProduto(c.codigo).fundo }}>
                              <div className="flex flex-col">
                                 <span className="text-base">{c.nome}</span>
                                 <span className="text-xs font-mono mt-1 px-1.5 py-0.5 rounded self-start" style={{ backgroundColor: corDoProduto(c.codigo).fundo, color: corDoProduto(c.codigo).texto }}>{c.codigo}</span>
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
                           <td className="px-4 py-5 text-right font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 border-l border-slate-100 dark:border-gray-700">
                              {mediaLt !== 0 ? paraReais(mediaLt) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right text-blue-600 bg-blue-50 dark:bg-blue-900/10">
                              {mediaLt !== 0 && despesaPorLitro > 0 ? paraReais(despesaPorLitro) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20">
                              {valorVenda !== 0 ? paraReais(valorVenda) : '-'}
                           </td>
                           <td className="px-4 py-5 text-right font-medium text-emerald-600 border-l border-slate-100 dark:border-gray-700">
                              {precoBomba > 0 ? paraReais(precoBomba) : '-'}
                           </td>
                           <td className={`px-4 py-5 text-right font-bold ${sobraLt > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/10' : sobraLt < 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/10' : 'text-slate-400'}`}>
                              {valorVenda !== 0 && precoBomba > 0 ? (
                                 <span className="flex flex-col">
                                    <span>{sobraLt > 0 ? '+' : ''}{paraReais(sobraLt)}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-wider">
                                       {sobraLt >= 0 ? 'sobra' : 'abaixo do custo'}
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
                     <td className="px-4 py-3 text-right bg-orange-900 text-orange-200">
                        {formatarParaBR(totais.totalCompraLt, 0)}
                     </td>
                     <td className="px-4 py-3 text-right bg-orange-900 text-orange-200">
                        {paraReais(totais.totalCompraRs)}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900">
                        {paraReais(totais.mediaTotal)}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900 text-blue-200">
                        {despesaPorLitro > 0 ? paraReais(despesaPorLitro) : '-'}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900">
                        {totais.mediaTotal > 0 ? paraReais(totais.mediaTotal + despesaPorLitro) : '-'}
                     </td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </section>
   );
};
