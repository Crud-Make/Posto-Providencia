import React from 'react';
import { TrendingUp } from 'lucide-react';
import { CombustivelHibrido, VendaBicoMes } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais } from '../../utils/formatters';

/**
 * Propriedades do componente SecaoVendas.
 */
interface Props {
   /** Produtos, para o custo e o valor p/ venda de cada um */
   combustiveis: CombustivelHibrido[];
   /** Venda do mês bico a bico — as linhas 5–10 do resumo da planilha */
   vendasBicos: VendaBicoMes[];
   /** Objeto contendo funções de cálculos financeiros */
   calculos: CalculosRegistro;
   /** Totais consolidados para exibição no rodapé */
   totais: CalculosRegistro['totais'];
   /** Último dia do mês com todos os bicos fechados; `null` sem leitura. */
   ultimoDiaFechado: number | null;
   /** Quantos dias o mês selecionado tem. */
   diasNoMes: number;
}

/**
 * Seção de Vendas (Leituras) da tela de compras — SOMENTE LEITURA, por bico.
 *
 * @remarks As leituras vêm de `Leitura`, consolidadas pelo mês: são as mesmas
 *          que o painel e o app do dono já lançaram dia a dia. A planilha
 *          redigita esses números no resumo por falta de vínculo; aqui o
 *          vínculo existe, e digitar de novo seria uma segunda versão do mesmo
 *          encerrante. Uma linha por bico, como na planilha (`D5:E10`): o dono
 *          confere o encerrante de cada bico, não a soma dos três de Comum.
 *
 *          Fórmulas da planilha, célula a célula:
 *          - preço do mês = bruto ÷ litros do bico (a planilha digita `G5`)
 *          - lucro LT     = preço do bico − valor p/ venda do produto (`I5 = G5 − G16`)
 *          - lucro bico   = lucro LT × litros (`J5 = I5 × F5`)
 *          - prod. vendido = Σ litros dos bicos do produto (`L5 = F5+F9+F10`)
 */
export const SecaoVendas: React.FC<Props> = ({ combustiveis, vendasBicos, calculos, totais, ultimoDiaFechado, diasNoMes }) => {
   const mesParcial = ultimoDiaFechado !== null && ultimoDiaFechado < diasNoMes;
   const produtoPorId = new Map(combustiveis.map((c) => [c.id, c]));
   const litrosTotais = vendasBicos.reduce((acc, b) => acc + b.litros, 0);

   /** Primeiro bico de cada produto — é nele que a planilha imprime o total do produto. */
   const primeiroBicoDoProduto = new Map<number, number>();
   for (const b of vendasBicos) if (!primeiroBicoDoProduto.has(b.produtoId)) primeiroBicoDoProduto.set(b.produtoId, b.bicoId);

   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
         <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <TrendingUp className="text-white" size={24} />
               <h2 className="text-white font-semibold text-lg">Vendas (Leituras)</h2>
            </div>
            <span className="text-xs text-emerald-100/90">
               {ultimoDiaFechado === null
                  ? 'Nenhum fechamento lançado neste mês'
                  : `Lidas do fechamento diário — dia 1 a ${ultimoDiaFechado} de ${diasNoMes}`}
            </span>
         </div>
         {mesParcial && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-xs text-amber-800 dark:text-amber-200">
               <strong>Mês parcial.</strong> A despesa do mês inteiro está sendo rateada só pelos litros lançados até o dia {ultimoDiaFechado} — o custo por litro sai inflado e o lucro, subestimado. Os números fecham quando o mês estiver todo lançado.
            </div>
         )}
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 dark:bg-gray-700 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <tr>
                     <th className="px-4 py-4 min-w-[140px]">Bico</th>
                     <th className="px-4 py-4 text-right">Inicial</th>
                     <th className="px-4 py-4 text-right">Fechamento</th>
                     <th className="px-4 py-4 text-right">Litros</th>
                     <th className="px-4 py-4 text-right text-emerald-600">Preço do Mês R$</th>
                     <th className="px-4 py-4 text-right text-blue-600">Valor p/ Bico</th>
                     <th className="px-4 py-4 text-right text-green-600">Lucro LT R$</th>
                     <th className="px-4 py-4 text-right text-green-600">Lucro Bico R$</th>
                     <th className="px-4 py-4 text-right">Margem %</th>
                     <th className="px-4 py-4 text-right">Prod. Vendido</th>
                     <th className="px-4 py-4 text-right">Produto %</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {vendasBicos.length === 0 && (
                     <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-500">Nenhuma leitura lançada neste mês.</td>
                     </tr>
                  )}
                  {vendasBicos.map((b) => {
                     const produto = produtoPorId.get(b.produtoId);
                     const valorParaVenda = produto ? calculos.calcValorParaVenda(produto) : 0;
                     const preco = b.precoMedio ?? 0;
                     const lucroLt = preco > 0 && valorParaVenda > 0 ? preco - valorParaVenda : 0;
                     const lucroBico = lucroLt * b.litros;
                     const margemPct = b.bruto > 0 ? (lucroBico / b.bruto) * 100 : 0;
                     const litrosProduto = produto ? calculos.calcLitrosVendidos(produto) : 0;
                     const mostraProduto = primeiroBicoDoProduto.get(b.produtoId) === b.bicoId;
                     const produtoPct = litrosTotais > 0 ? (litrosProduto / litrosTotais) * 100 : 0;

                     return (
                        <tr key={b.bicoId} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                           <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                              <div className="flex flex-col">
                                 <span className="text-base">Bico {String(b.numero).padStart(2, '0')}</span>
                                 <span className="text-xs text-slate-500 mt-0.5">{b.produtoNome}</span>
                              </div>
                           </td>
                           <td className="px-4 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                              {b.inicial === null ? '-' : formatarParaBR(b.inicial)}
                           </td>
                           <td className="px-4 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                              {b.fechamento === null ? '-' : formatarParaBR(b.fechamento)}
                           </td>
                           <td className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30">
                              {b.litros > 0 ? formatarParaBR(b.litros, 0) : '-'}
                           </td>
                           <td className="px-4 py-4 text-right font-medium text-emerald-600">
                              {preco > 0 ? formatarParaBR(preco, 2) : '-'}
                           </td>
                           <td className="px-4 py-4 text-right font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10">
                              {b.bruto > 0 ? paraReais(b.bruto) : '-'}
                           </td>
                           <td className={`px-4 py-4 text-right ${lucroLt < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {lucroLt !== 0 ? paraReais(lucroLt) : '-'}
                           </td>
                           <td className={`px-4 py-4 text-right font-bold ${lucroBico < 0 ? 'text-red-700 bg-red-50 dark:bg-red-900/10' : 'text-green-700 bg-green-50 dark:bg-green-900/10'}`}>
                              {lucroBico !== 0 ? paraReais(lucroBico) : '-'}
                           </td>
                           <td className={`px-4 py-4 text-right ${margemPct < 0 ? 'text-red-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                              {margemPct !== 0 ? `${formatarParaBR(margemPct, 2)}%` : '-'}
                           </td>
                           <td className="px-4 py-4 text-right">
                              {mostraProduto && litrosProduto > 0 ? formatarParaBR(litrosProduto, 0) : ''}
                           </td>
                           <td className="px-4 py-4 text-right font-bold">
                              {mostraProduto && produtoPct > 0 ? `${formatarParaBR(produtoPct, 2)}%` : ''}
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
                     <td className="px-4 py-3 text-right text-slate-300">
                        {totais.totalLitros > 0 ? formatarParaBR(totais.totalValorBico / totais.totalLitros, 2) : '-'}
                     </td>
                     <td className="px-4 py-3 text-right bg-blue-900">{paraReais(totais.totalValorBico)}</td>
                     <td className="px-4 py-3 text-right text-slate-400">-</td>
                     <td className={`px-4 py-3 text-right ${totais.totalLucroBico < 0 ? 'bg-red-800' : 'bg-green-800'}`}>{paraReais(totais.totalLucroBico)}</td>
                     <td className="px-4 py-3 text-right bg-slate-700">{formatarParaBR(totais.margemMedia, 2)}%</td>
                     <td className="px-4 py-3 text-right">{formatarParaBR(totais.totalLitros, 0)}</td>
                     <td className="px-4 py-3 text-right">100,00%</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </section>
   );
};
