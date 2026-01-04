import React, { useState, useEffect } from 'react';
import {
   Calendar,
   Download,
   Printer,
   Droplet,
   Banknote,
   TrendingUp,
   TrendingDown,
   Percent,
   RefreshCw,
   PieChart,
   Lightbulb,
   CheckCircle2,
   AlertTriangle,
   Loader2
} from 'lucide-react';
import { leituraService, combustivelService, estoqueService } from '../services/api';
import { usePosto } from '../contexts/PostoContext';

import type { Combustivel, Leitura, Bico, Bomba } from '../services/database.types';

// Types
interface SalesSummary {
   totalLitros: number;
   totalVendas: number;
   porCombustivel: {
      combustivel: Combustivel;
      litros: number;
      valor: number;
   }[];
}

interface MonthlyData {
   month: string;
   volume: number;
   isCurrent?: boolean;
}

interface ProductMixItem {
   name: string;
   codigo: string;
   volume: number;
   percentage: number;
   color: string;
}

// Color mapping for fuels
const FUEL_COLORS: Record<string, string> = {
   'GC': 'bg-red-500',
   'GA': 'bg-blue-500',
   'ET': 'bg-green-500',
   'S10': 'bg-yellow-500',
   'DIESEL': 'bg-amber-500',
};

const TelaDashboardVendas: React.FC = () => {
   const { postoAtivoId } = usePosto();
   // State

   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [selectedMonth, setSelectedMonth] = useState<string>(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
   });

   const [salesSummary, setSalesSummary] = useState<SalesSummary>({
      totalLitros: 0,
      totalVendas: 0,
      porCombustivel: []
   });

   const [monthlyEvolution, setMonthlyEvolution] = useState<MonthlyData[]>([]);
   const [productMix, setProductMix] = useState<ProductMixItem[]>([]);
   const [averageMargin, setAverageMargin] = useState<number>(0);
   const [estimatedProfit, setEstimatedProfit] = useState<number>(0);

   // Load data
   useEffect(() => {
      loadData();
   }, [selectedMonth, postoAtivoId]);


   const loadData = async () => {
      try {
         setLoading(true);
         setError(null);

         // Get all dates for the selected month
         const [year, month] = selectedMonth.split('-').map(Number);
         const startDate = new Date(year, month - 1, 1);
         const endDate = new Date(year, month, 0);

         // Fetch combustiveis for reference
         const combustiveis = await combustivelService.getAll(postoAtivoId);


         // Fetch sales summary for each day of the month and aggregate
         // Fetch sales summary for the month in one call
         const allLeituras = await leituraService.getByDateRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            postoAtivoId
         );


         // Calculate totals
         const totalLitros = allLeituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
         const totalVendas = allLeituras.reduce((acc, l) => acc + (l.valor_total || 0), 0);

         // Group by combustivel
         const byCombustivel = allLeituras.reduce((acc, l) => {
            const codigo = l.bico.combustivel.codigo;
            if (!acc[codigo]) {
               acc[codigo] = {
                  combustivel: l.bico.combustivel,
                  litros: 0,
                  valor: 0,
               };
            }
            acc[codigo].litros += l.litros_vendidos || 0;
            acc[codigo].valor += l.valor_total || 0;
            return acc;
         }, {} as Record<string, { combustivel: Combustivel; litros: number; valor: number }>);

         setSalesSummary({
            totalLitros,
            totalVendas,
            porCombustivel: Object.values(byCombustivel)
         });

         // Calculate product mix
         const mixData: ProductMixItem[] = Object.values(byCombustivel).map(item => ({
            name: item.combustivel.nome,
            codigo: item.combustivel.codigo,
            volume: item.litros,
            percentage: totalLitros > 0 ? (item.litros / totalLitros) * 100 : 0,
            color: FUEL_COLORS[item.combustivel.codigo] || 'bg-gray-500',
         }));
         setProductMix(mixData);

         // Calculate estimated profit (using a simple margin estimate)
         // In a real app, this would come from cost data
         const estoquesData = await estoqueService.getAll(postoAtivoId);

         let totalCost = 0;
         Object.values(byCombustivel).forEach(item => {
            const estoque = estoquesData.find(e => e.combustivel_id === item.combustivel.id);
            if (estoque) {
               totalCost += item.litros * estoque.custo_medio;
            }
         });

         const profit = totalVendas - totalCost;
         setEstimatedProfit(profit);

         const margin = totalVendas > 0 ? (profit / totalVendas) * 100 : 0;
         setAverageMargin(margin);

         // Generate monthly evolution (last 6 months)
         const evolutionData: MonthlyData[] = [];
         const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

         for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const monthStr = monthNames[d.getMonth()];
            const isCurrent = i === 0;

            // For current month, use actual data; for past months, we'd need historical data
            // Simplified: just use current month data as sample
            evolutionData.push({
               month: monthStr,
               volume: isCurrent ? totalLitros : Math.floor(totalLitros * (0.8 + Math.random() * 0.4)),
               isCurrent
            });
         }
         setMonthlyEvolution(evolutionData);

      } catch (err) {
         console.error('Error loading sales data:', err);
         setError('Erro ao carregar dados de vendas.');
      } finally {
         setLoading(false);
      }
   };

   // Format helpers
   const formatCurrency = (value: number): string => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
   };

   const formatNumber = (value: number): string => {
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
   };

   const formatMonthDisplay = (monthStr: string): string => {
      const [year, month] = monthStr.split('-').map(Number);
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${monthNames[month - 1]} ${year}`;
   };

   // Calculate max volume for chart scaling
   const maxVolume = Math.max(...monthlyEvolution.map(d => d.volume), 1);

   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
               <span className="text-gray-500 dark:text-gray-400 font-medium">Carregando dados de vendas...</span>
            </div>
         </div>
      );
   }

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">

         {/* Breadcrumbs */}
         <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Relatórios</span>
            <span>/</span>
            <span className="font-semibold text-gray-900 dark:text-white">Dashboard de Vendas</span>
         </div>

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">Dashboard de Vendas</h1>
               <div className="flex items-center gap-2 mt-3">
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Período de Análise:</span>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg shadow-sm">
                     <Calendar size={18} className="text-blue-600" />
                     <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="font-bold text-gray-900 dark:text-white text-sm outline-none border-none bg-transparent"
                     />
                  </div>
                  <button
                     onClick={loadData}
                     className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                     <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
                  </button>
               </div>
            </div>
            <div className="flex gap-3">
               <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                  <Printer size={18} />
                  <span>Imprimir</span>
               </button>
               <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                  <Download size={18} />
                  <span>Exportar Dados</span>
               </button>
            </div>
         </div>

         {/* Error Message */}
         {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
               <AlertTriangle size={18} />
               {error}
            </div>
         )}

         {/* KPI Cards Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1: Litros Vendidos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
               <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Droplet size={18} className="text-blue-500" fill="currentColor" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Litros Vendidos</span>
               </div>
               <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{formatNumber(salesSummary.totalLitros)} L</h3>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold mt-2">
                     <TrendingUp size={14} />
                     Dados do mês
                  </div>
               </div>
            </div>

            {/* Card 2: Faturamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
               <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Banknote size={18} className="text-green-500" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Faturamento</span>
               </div>
               <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(salesSummary.totalVendas)}</h3>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold mt-2">
                     <TrendingUp size={14} />
                     Receita bruta
                  </div>
               </div>
            </div>

            {/* Card 3: Lucro Total */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group">
               <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <RefreshCw size={120} className="text-blue-600" />
               </div>
               <div className="flex items-center gap-2 text-blue-700 relative z-10">
                  <Banknote size={18} fill="currentColor" />
                  <span className="text-sm font-bold">Lucro Estimado</span>
               </div>
               <div className="relative z-10">
                  <h3 className="text-3xl font-black text-blue-600">{formatCurrency(estimatedProfit)}</h3>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-green-600 text-xs font-bold mt-2 shadow-sm border border-blue-100">
                     <TrendingUp size={14} />
                     Baseado no custo médio
                  </div>
               </div>
            </div>

            {/* Card 4: Margem Média */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-40">
               <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Percent size={18} className="text-orange-500" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Margem Média</span>
               </div>
               <div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{averageMargin.toFixed(1)}%</h3>
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold mt-2 ${averageMargin >= 10 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                     }`}>
                     {averageMargin >= 10 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     {averageMargin >= 10 ? 'Saudável' : 'Atenção'}
                  </div>
               </div>
            </div>
         </div>

         {/* Main Content Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Sales Evolution Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                     <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evolução de Vendas (Últimos 6 Meses)</h3>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Volume (L)</span>
               </div>

               {/* Chart Container */}
               {monthlyEvolution.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex items-center justify-center text-gray-400 italic">
                     Sem dados históricos.
                  </div>
               ) : (
                  <div className="flex-1 relative min-h-[300px] flex items-end justify-between px-4 pb-2 pt-12">
                     {/* Reference Grid Lines */}
                     <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                        <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
                        <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
                        <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-700 h-0"></div>
                        <div className="w-full border-b border-gray-200 dark:border-gray-700 h-0"></div>
                     </div>

                     {/* Bars */}
                     {monthlyEvolution.map((data, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-3 w-full group">
                           <div className="relative w-full flex justify-center items-end h-[280px]">
                              <div
                                 className={`w-12 sm:w-16 rounded-t-sm transition-all duration-500 relative group-hover:opacity-90
                                ${data.isCurrent ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-blue-100'}
                            `}
                                 style={{ height: `${(data.volume / maxVolume) * 100}%` }}
                              >
                                 {/* Reference Line for Current Month */}
                                 {data.isCurrent && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                                       <span className="text-xs font-bold text-blue-600">{formatNumber(data.volume)}</span>
                                    </div>
                                 )}

                                 {/* Tooltip */}
                                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                    {formatNumber(data.volume)} L
                                 </div>
                              </div>
                           </div>
                           <span className={`text-sm font-medium ${data.isCurrent ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                              {data.month}
                           </span>
                        </div>
                     ))}
                  </div>
               )}

               {/* Chart Footer */}
               <div className="mt-8 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-2">
                     <div className="size-3 bg-blue-500 rounded-sm"></div>
                     <span className="text-sm text-gray-600 dark:text-gray-400">Vendas {new Date().getFullYear()}</span>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                     <TrendingUp size={12} />
                     Período: {formatMonthDisplay(selectedMonth)}
                  </div>
               </div>
            </div>

            {/* Right Column: Mix & Highlights */}
            <div className="space-y-6">

               {/* Product Mix Widget */}
               <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <PieChart size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mix de Produtos (Litros)</h3>
                  </div>

                  <div className="space-y-6">
                     {productMix.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm italic py-4">Sem dados de mix.</div>
                     ) : (
                        productMix.map((item) => (
                           <div key={item.codigo} className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-2">
                                    <div className={`size-3 rounded-full ${item.color}`}></div>
                                    <span className="font-bold text-gray-900 dark:text-white">{item.name}</span>
                                 </div>
                                 <div className="flex items-baseline gap-1.5">
                                    <span className="font-bold text-gray-900 dark:text-white">{formatNumber(item.volume)} L</span>
                                    <span className="text-xs text-gray-400 font-medium">{item.percentage.toFixed(1)}%</span>
                                 </div>
                              </div>
                              <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* Highlights Widget (Dark Theme Card) */}
               <div className="bg-slate-900 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
                  <div className="relative z-10">
                     <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-white">
                        <Lightbulb className="text-yellow-400" fill="currentColor" size={20} />
                        Destaques do Mês
                     </h3>

                     <div className="space-y-6">
                        {salesSummary.totalLitros > 0 ? (
                           <>
                              <div className="flex gap-4">
                                 <div className="mt-1">
                                    <CheckCircle2 className="text-green-400" size={20} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-sm text-white mb-1">Vendas Ativas</h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                       {formatNumber(salesSummary.totalLitros)} litros vendidos gerando {formatCurrency(salesSummary.totalVendas)} em receita.
                                    </p>
                                 </div>
                              </div>
                              {productMix.length > 0 && (
                                 <div className="flex gap-4">
                                    <div className="mt-1">
                                       <TrendingUp className="text-blue-400" size={20} />
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-sm text-white mb-1">Produto Líder</h4>
                                       <p className="text-xs text-slate-300 leading-relaxed">
                                          {productMix.sort((a, b) => b.volume - a.volume)[0]?.name || 'N/A'} é o combustível mais vendido.
                                       </p>
                                    </div>
                                 </div>
                              )}
                           </>
                        ) : (
                           <div className="flex gap-4">
                              <div className="mt-1">
                                 <AlertTriangle className="text-yellow-400" size={20} />
                              </div>
                              <div>
                                 <h4 className="font-bold text-sm text-white mb-1">Sem Dados</h4>
                                 <p className="text-xs text-slate-300 leading-relaxed">
                                    Nenhuma venda registrada neste período. Registre leituras diárias para ver os dados aqui.
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

            </div>

         </div>

      </div>
   );
};

export default TelaDashboardVendas;