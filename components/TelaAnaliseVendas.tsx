import React, { useState, useEffect, useMemo } from 'react';
import {
   Calendar,
   Download,
   BarChart2,
   TrendingUp,
   TrendingDown,
   Minus,
   ArrowRight,
   Droplet,
   DollarSign,
   PieChart,
   Percent,
   Coins,
   Lightbulb,
   CheckCircle2,
   AlertTriangle,
   Loader2,
   RefreshCw
} from 'lucide-react';
import { salesAnalysisService } from '../services/api';
import { usePosto } from '../contexts/PostoContext';


// Type definitions
interface ProductData {
   id: string;
   name: string;
   code: string;
   colorClass: string;
   bicos: string;
   readings: { start: number; end: number };
   volume: number;
   price: number;
   cost: number;
   total: number;
   profit: number;
   margin: number;
   suggestedPrice?: number;
   expensePerLiter?: number;
   avgCost?: number;
}

interface ProfitabilityData {
   name: string;
   value: number;
   percentage: number;
   margin: number;
   color: string;
}

interface Totals {
   volume: number;
   revenue: number;
   profit: number;
   avgMargin: number;
   avgProfitPerLiter: number;
}

const TelaAnaliseVendas: React.FC = () => {
   const { postoAtivoId } = usePosto();
   const [loading, setLoading] = useState(true);

   const [error, setError] = useState<string | null>(null);
   const [products, setProducts] = useState<ProductData[]>([]);
   const [profitability, setProfitability] = useState<ProfitabilityData[]>([]);
   const [totals, setTotals] = useState<Totals>({ volume: 0, revenue: 0, profit: 0, avgMargin: 0, avgProfitPerLiter: 0 });
   const [previousPeriod, setPreviousPeriod] = useState<{ volume: number; revenue: number; profit: number } | null>(null);

   // Date selection
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

   const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
   ];

   // Calculate variations
   const variations = useMemo(() => {
      if (!previousPeriod || previousPeriod.volume === 0) {
         return { volume: 0, revenue: 0, profit: 0 };
      }
      return {
         volume: previousPeriod.volume > 0 ? ((totals.volume - previousPeriod.volume) / previousPeriod.volume) * 100 : 0,
         revenue: previousPeriod.revenue > 0 ? ((totals.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100 : 0,
         profit: previousPeriod.profit > 0 ? ((totals.profit - previousPeriod.profit) / previousPeriod.profit) * 100 : 0,
      };
   }, [totals, previousPeriod]);

   const loadData = async () => {
      try {
         setLoading(true);
         setError(null);

         const data = await salesAnalysisService.getMonthlyAnalysis(selectedYear, selectedMonth, postoAtivoId);

         setProducts(data.products);

         setProfitability(data.profitability);
         setTotals(data.totals);
         setPreviousPeriod(data.previousPeriod || null);
      } catch (err) {
         console.error('Erro ao carregar dados:', err);
         setError('Erro ao carregar dados de análise. Verifique sua conexão.');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadData();
   }, [selectedYear, selectedMonth, postoAtivoId]);


   // Generate insights based on data
   const insights = useMemo(() => {
      const result: { type: 'success' | 'warning' | 'info'; title: string; message: string }[] = [];

      if (products.length === 0) {
         result.push({
            type: 'info',
            title: 'Análise Inicial',
            message: 'O sistema está aguardando mais dados para gerar recomendações precisas sobre margens e performance.'
         });
         return result;
      }

      // Find best and worst products
      const sortedByProfit = [...products].sort((a, b) => b.profit - a.profit);
      const sortedByMargin = [...products].sort((a, b) => b.margin - a.margin);

      if (sortedByProfit.length > 0) {
         const best = sortedByProfit[0];
         const percentage = totals.profit > 0 ? (best.profit / totals.profit * 100).toFixed(1) : '0';
         result.push({
            type: 'success',
            title: `Produto mais lucrativo: ${best.name}`,
            message: `Representa ${percentage}% do lucro total do período.`
         });
      }

      // Low margin alert
      const lowMarginProducts = products.filter(p => p.margin < 10 && p.margin > 0);
      if (lowMarginProducts.length > 0) {
         const product = lowMarginProducts[0];
         result.push({
            type: 'warning',
            title: `${product.name} com margem baixa (${product.margin.toFixed(2)}%)`,
            message: `Considere ajustar o preço de R$ ${product.price.toFixed(2)} para atingir margem de 10%.`
         });
      }

      // Volume leader
      const sortedByVolume = [...products].sort((a, b) => b.volume - a.volume);
      if (sortedByVolume.length > 0) {
         const leader = sortedByVolume[0];
         const volumeShare = totals.volume > 0 ? (leader.volume / totals.volume * 100).toFixed(1) : '0';
         result.push({
            type: 'info',
            title: `${leader.name}: ${volumeShare}% das vendas em litros`,
            message: 'Principal produto do posto em volume.'
         });
      }

      return result;
   }, [products, totals]);

   // Render variation badge
   const renderVariation = (value: number) => {
      if (value === 0) {
         return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
               <Minus size={12} />
               0%
            </div>
         );
      }
      if (value > 0) {
         return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold mt-1">
               <TrendingUp size={12} />
               +{value.toFixed(1)}%
            </div>
         );
      }
      return (
         <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-bold mt-1">
            <TrendingDown size={12} />
            {value.toFixed(1)}%
         </div>
      );
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
               <span className="text-gray-500 font-medium">Carregando análise de vendas...</span>
            </div>
         </div>
      );
   }

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">

         {/* Breadcrumbs */}
         <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Relatórios</span>
            <span>/</span>
            <span className="font-semibold text-gray-900">Vendas Mensais</span>
         </div>

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Análise de Vendas</h1>
               <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-500">Período:</span>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                     <Calendar size={16} className="text-blue-600" />
                     <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="font-bold text-gray-900 text-sm outline-none bg-transparent cursor-pointer"
                     >
                        {monthNames.map((name, idx) => (
                           <option key={idx} value={idx + 1}>{name}</option>
                        ))}
                     </select>
                     <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="font-bold text-gray-900 text-sm outline-none bg-transparent cursor-pointer"
                     >
                        {[2023, 2024, 2025, 2026].map(year => (
                           <option key={year} value={year}>{year}</option>
                        ))}
                     </select>
                  </div>
                  <button
                     onClick={loadData}
                     className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                     title="Atualizar dados"
                  >
                     <RefreshCw size={16} className="text-gray-500" />
                  </button>
               </div>
            </div>
            <div className="flex gap-3">
               <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                  <Download size={18} />
                  <span>Excel</span>
               </button>
               <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                  <Download size={18} />
                  <span>PDF</span>
               </button>
               <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                  <BarChart2 size={18} />
                  <span>Gráfico Detalhado</span>
               </button>
            </div>
         </div>

         {/* Error Message */}
         {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2">
               <AlertTriangle size={18} />
               {error}
            </div>
         )}

         {/* KPI Cards Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

            {/* Card 1: Total Vendido */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
               <div className="flex items-center gap-2 text-gray-500">
                  <Droplet size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Vendido</span>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900">
                     {totals.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
                  </h3>
                  {renderVariation(variations.volume)}
               </div>
            </div>

            {/* Card 2: Faturamento */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
               <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Faturamento</span>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900">
                     R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  {renderVariation(variations.revenue)}
               </div>
            </div>

            {/* Card 3: Lucro Total (Highlighted) */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Coins size={60} className="text-blue-600" />
               </div>
               <div className="flex items-center gap-2 text-blue-700">
                  <PieChart size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Lucro Total</span>
               </div>
               <div className="relative z-10">
                  <h3 className="text-2xl font-black text-blue-900">
                     R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  {renderVariation(variations.profit)}
               </div>
            </div>

            {/* Card 4: Margem Média */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
               <div className="flex items-center gap-2 text-gray-500">
                  <Percent size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Margem Média</span>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900">{totals.avgMargin.toFixed(2)}%</h3>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
                     <Minus size={12} />
                     Estável
                  </div>
               </div>
            </div>

            {/* Card 5: Lucro Médio/L */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
               <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Lucro Médio/L</span>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900">
                     R$ {totals.avgProfitPerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
                     <Minus size={12} />
                     Estável
                  </div>
               </div>
            </div>

         </div>

         {/* Main Content Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Sales Table */}
            <div className="lg:col-span-2 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <BarChart2 className="text-blue-600" />
                     <h2 className="text-xl font-bold text-gray-900">Vendas por Produto</h2>
                  </div>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                     Ver todas as bombas <ArrowRight size={16} />
                  </button>
               </div>

               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                           <tr>
                              <th className="px-6 py-4">Produto</th>
                              <th className="px-6 py-4">Leitura (Ini/Fim)</th>
                              <th className="px-6 py-4">Litros</th>
                              <th className="px-6 py-4">Preço (Prat. / Sugerido)</th>
                              <th className="px-6 py-4 text-right">Total</th>
                              <th className="px-6 py-4 text-right">Lucro</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {products.length === 0 ? (
                              <tr>
                                 <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm italic">
                                    Nenhum registro de vendas no período.
                                 </td>
                              </tr>
                           ) : (
                              products.map((item) => (
                                 <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className={`size-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${item.colorClass}`}>
                                             {item.code}
                                          </div>
                                          <div>
                                             <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                             <p className="text-xs text-gray-400 mt-0.5">{item.bicos}</p>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col text-xs font-mono">
                                          <span className="text-gray-400">{item.readings.start?.toLocaleString('pt-BR') || '-'}</span>
                                          <span className="text-gray-900 font-bold">{item.readings.end?.toLocaleString('pt-BR') || '-'}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className="text-sm font-medium text-gray-900">{item.volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col">
                                          <span className="text-sm font-bold text-gray-900">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          {item.suggestedPrice && (
                                             <span className="text-xs text-gray-400" title="Preço Sugerido (Custo + Despesas)">
                                                Sug: R$ {item.suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                             </span>
                                          )}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex flex-col">
                                          <span className="text-xs text-gray-400 uppercase font-bold">R$</span>
                                          <span className="text-sm font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${item.margin < 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                                          R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                       </span>
                                       <p className="text-[10px] text-gray-400 mt-0.5">{item.margin.toFixed(1)}% margem</p>
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-100">
                           <tr>
                              <td className="px-6 py-4 font-bold text-gray-900 text-sm">Totais Consolidados</td>
                              <td className="px-6 py-4"></td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-sm">{totals.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                              <td className="px-6 py-4 text-center text-gray-400">-</td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                                 R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-blue-600 text-sm">
                                 R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            </div>

            {/* Right Column: Profitability & Insights */}
            <div className="space-y-6">

               {/* Profitability Widget */}
               <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                        <PieChart size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 leading-tight">Lucratividade por <br /> Produto</h3>
                  </div>

                  <div className="space-y-6">
                     {profitability.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm italic py-4">Sem dados de lucratividade.</div>
                     ) : (
                        profitability.map((item) => (
                           <div key={item.name} className="space-y-2">
                              <div className="flex justify-between items-baseline">
                                 <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-gray-900">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span className="text-xs text-gray-400">({item.percentage.toFixed(1)}%)</span>
                                 </div>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                 <div className="h-full rounded-full" style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }}></div>
                              </div>
                              <p className="text-xs text-gray-400">Margem: {item.margin.toFixed(1)}%</p>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* Insights Widget (Dark Theme Card) */}
               <div className="bg-[#0F172A] rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
                  <div className="relative z-10">
                     <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-white">
                        <Lightbulb className="text-yellow-400" fill="currentColor" size={20} />
                        Insights & <br /> Recomendações
                     </h3>

                     <div className="space-y-6">
                        {insights.map((insight, idx) => (
                           <div key={idx} className="flex gap-4">
                              <div className="mt-1">
                                 {insight.type === 'success' && <CheckCircle2 className="text-green-400" size={20} />}
                                 {insight.type === 'warning' && <AlertTriangle className="text-yellow-400" size={20} />}
                                 {insight.type === 'info' && <Lightbulb className="text-blue-400" size={20} />}
                              </div>
                              <div>
                                 <h4 className={`font-bold text-sm mb-1 ${insight.type === 'success' ? 'text-green-400' :
                                    insight.type === 'warning' ? 'text-yellow-400' :
                                       'text-blue-400'
                                    }`}>{insight.title}</h4>
                                 <p className="text-sm text-gray-300 leading-relaxed">
                                    {insight.message}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Decorative Gradient Blob */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
               </div>

            </div>

         </div>

      </div>
   );
};

export default TelaAnaliseVendas;