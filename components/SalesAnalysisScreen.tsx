import React from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { SALES_ANALYSIS_PRODUCTS, SALES_PROFITABILITY } from '../constants';

const SalesAnalysisScreen: React.FC = () => {
  // Calculate Totals
  const totalVolume = SALES_ANALYSIS_PRODUCTS.reduce((acc, curr) => acc + curr.volume, 0);
  const totalRevenue = SALES_ANALYSIS_PRODUCTS.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = SALES_ANALYSIS_PRODUCTS.reduce((acc, curr) => acc + curr.profit, 0);

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
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
                 <Calendar size={16} className="text-blue-600" />
                 <span className="font-bold text-gray-900 text-sm">Outubro 2023</span>
                 <span className="text-gray-400 text-xs">▼</span>
              </div>
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
         
         {/* Card 1: Total Vendido */}
         <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-gray-500">
               <Droplet size={18} />
               <span className="text-xs font-bold uppercase tracking-wider">Total Vendido</span>
            </div>
            <div>
               <h3 className="text-2xl font-black text-gray-900">0 L</h3>
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold mt-1">
                  <TrendingUp size={12} />
                  0% vs mês ant.
               </div>
            </div>
         </div>

         {/* Card 2: Faturamento */}
         <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-gray-500">
               <DollarSign size={18} />
               <span className="text-xs font-bold uppercase tracking-wider">Faturamento</span>
            </div>
            <div>
               <h3 className="text-2xl font-black text-gray-900">R$ 0,00</h3>
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs font-bold mt-1">
                  <TrendingUp size={12} />
                  0%
               </div>
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
               <h3 className="text-2xl font-black text-blue-900">R$ 0,00</h3>
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/60 text-blue-700 text-xs font-bold mt-1 backdrop-blur-sm">
                  <TrendingUp size={12} />
                  0%
               </div>
            </div>
         </div>

         {/* Card 4: Margem Média */}
         <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-gray-500">
               <Percent size={18} />
               <span className="text-xs font-bold uppercase tracking-wider">Margem Média</span>
            </div>
            <div>
               <h3 className="text-2xl font-black text-gray-900">0.0%</h3>
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
                  <Minus size={12} />
                  0%
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
               <h3 className="text-2xl font-black text-gray-900">R$ 0,00</h3>
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold mt-1">
                  <Minus size={12} />
                  0%
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
                           <th className="px-6 py-4">Preço/L</th>
                           <th className="px-6 py-4 text-right">Total</th>
                           <th className="px-6 py-4 text-right">Lucro</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {SALES_ANALYSIS_PRODUCTS.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm italic">
                                    Nenhum registro de vendas no período.
                                </td>
                            </tr>
                        ) : (
                            SALES_ANALYSIS_PRODUCTS.map((item) => (
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
                                        <span className="text-gray-400">{item.readings.start.toLocaleString('pt-BR')}</span>
                                        <span className="text-gray-900 font-bold">{item.readings.end.toLocaleString('pt-BR')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-gray-900">{item.volume.toLocaleString('pt-BR')}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-500">R$ {item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 uppercase font-bold">R$</span>
                                        <span className="text-sm font-bold text-gray-900">{item.total.toLocaleString('pt-BR')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded">
                                        R$ {item.profit.toLocaleString('pt-BR')}
                                    </span>
                                </td>
                            </tr>
                            ))
                        )}
                     </tbody>
                     <tfoot className="bg-gray-50 border-t border-gray-100">
                        <tr>
                           <td className="px-6 py-4 font-bold text-gray-900 text-sm">Totais Consolidados</td>
                           <td className="px-6 py-4"></td>
                           <td className="px-6 py-4 font-bold text-gray-900 text-sm">{totalVolume.toLocaleString('pt-BR')}</td>
                           <td className="px-6 py-4 text-center text-gray-400">-</td>
                           <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                              R$ {Math.floor(totalRevenue).toLocaleString('pt-BR')}
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-blue-600 text-sm">
                              R$ {totalProfit.toLocaleString('pt-BR')}
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
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Lucratividade por <br/> Produto</h3>
               </div>

               <div className="space-y-6">
                  {SALES_PROFITABILITY.length === 0 ? (
                       <div className="text-center text-gray-400 text-sm italic py-4">Sem dados de lucratividade.</div>
                  ) : (
                      SALES_PROFITABILITY.map((item) => (
                        <div key={item.name} className="space-y-2">
                            <div className="flex justify-between items-baseline">
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-gray-900">R$ {item.value.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-gray-400">({item.percentage}%)</span>
                            </div>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
                            </div>
                            <p className="text-xs text-gray-400">Margem: {item.margin}%</p>
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
                     Insights & <br/> Recomendações
                  </h3>

                  <div className="space-y-6">
                     <div className="flex gap-4">
                        <div className="mt-1">
                           <CheckCircle2 className="text-green-400" size={20} />
                        </div>
                        <div>
                           <h4 className="font-bold text-sm text-green-400 mb-1">Análise Inicial</h4>
                           <p className="text-sm text-gray-300 leading-relaxed">
                              O sistema está aguardando mais dados para gerar recomendações precisas sobre margens e performance.
                           </p>
                        </div>
                     </div>
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

export default SalesAnalysisScreen;