import React, { useState } from 'react';
import { 
  Calendar, 
  Settings, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Banknote, 
  Tag, 
  Coins, 
  AlertTriangle, 
  Info,
  ArrowUp,
  HelpCircle,
  Save,
  Fuel
} from 'lucide-react';
import { PROFITABILITY_DATA } from '../constants';

const CostAnalysisScreen: React.FC = () => {
  // State for sliders
  const [gcMargin, setGcMargin] = useState<number>(12);
  const [dsMargin, setDsMargin] = useState<number>(2.3);

  // Constants for calculation (Gasolina Comum)
  const gcTotalCost = 5.30;
  const gcMonthlySales = 45200;
  
  // Constants for calculation (Diesel S-10)
  const dsTotalCost = 6.50;
  const dsMonthlySales = 28150;

  // Calculation helpers
  const calculatePrice = (cost: number, marginPercent: number) => {
    // Formula: Price = Cost / (1 - Margin/100)
    // Avoid division by zero if margin is 100 (unlikely for slider max)
    return cost / (1 - (marginPercent / 100));
  };

  const calculateProfit = (suggestedPrice: number, cost: number, volume: number) => {
    return (suggestedPrice - cost) * volume;
  };

  const gcSuggestedPrice = calculatePrice(gcTotalCost, gcMargin);
  const gcEstimatedProfit = calculateProfit(gcSuggestedPrice, gcTotalCost, gcMonthlySales);

  const dsSuggestedPrice = calculatePrice(dsTotalCost, dsMargin);
  const dsEstimatedProfit = calculateProfit(dsSuggestedPrice, dsTotalCost, dsMonthlySales);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#13ec6d]/10 text-[#0eb553] border border-[#13ec6d]/20">Financeiro</span>
            <span className="text-xs text-gray-400">Análise Mensal</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Análise de Custo e Margem</h2>
          <p className="text-gray-500 mt-2 max-w-2xl">Gerencie a lucratividade por combustível, simule preços e monitore margens líquidas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm h-10">
                <button className="p-1 hover:bg-gray-50 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2 px-3 border-x border-gray-100 mx-1">
                    <Calendar size={18} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-900">Dezembro 2025</span>
                </div>
                <button className="p-1 hover:bg-gray-50 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                    <ChevronRight size={20} />
                </button>
            </div>
            <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                <Settings size={20} />
                <span>Configurar Despesas</span>
            </button>
            <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[#13ec6d] text-[#0d1b13] text-sm font-bold hover:bg-[#13ec6d]/90 transition-colors shadow-sm shadow-[#13ec6d]/20">
                <Download size={20} />
                <span>Exportar Relatório</span>
            </button>
        </div>
      </div>

      {/* Main Grid: Analysis Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Card 1: Gasolina Comum */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <span className="font-bold text-sm">GC</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-none">Gasolina Comum</h3>
                        <p className="text-xs text-gray-400 mt-1">Tanque 01 • Bomba 02, 05</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <TrendingUp size={14} />
                        Margem Saudável
                    </span>
                </div>
            </div>

            {/* Card Body Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                
                {/* Custos */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Banknote size={14} /> Custos
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Custo Médio/L</span>
                            <span className="font-bold text-gray-900">R$ 4,85</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Desp. Oper./L</span>
                            <span className="font-bold text-gray-900">R$ 0,45</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Custo Total/L</span>
                            <span className="font-bold text-red-500">R$ 5,30</span>
                        </div>
                    </div>
                </div>

                {/* Venda */}
                <div className="space-y-3 md:pl-6 pt-4 md:pt-0">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag size={14} /> Venda
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Preço Atual/L</span>
                            <span className="font-bold text-gray-900 text-lg">R$ 5,89</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Vendas Mês</span>
                            <span className="font-bold text-gray-900">45.200 L</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Receita Bruta</span>
                            <span className="font-bold text-gray-900">R$ 266.228</span>
                        </div>
                    </div>
                </div>

                {/* Margem e Lucro */}
                <div className="space-y-3 md:pl-6 pt-4 md:pt-0">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Coins size={14} /> Margem e Lucro
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Margem Bruta</span>
                            <span className="font-bold text-gray-900">R$ 1,04</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Margem Líq./L</span>
                            <span className="font-bold text-green-500">+ R$ 0,59</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Lucro Total</span>
                            <span className="font-bold text-green-500 text-lg">R$ 26.668</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulator Footer */}
            <div className="px-6 py-4 bg-[#13ec6d]/5 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-900 mb-2 block">
                            Simulador de Preço (Margem Desejada: <span>{gcMargin}</span>%)
                        </label>
                        <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            step="0.5" 
                            value={gcMargin}
                            onChange={(e) => setGcMargin(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#13ec6d]" 
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>0%</span>
                            <span>15%</span>
                            <span>30%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Preço Sugerido</p>
                            <p className="text-lg font-bold text-gray-900">R$ {gcSuggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Lucro Est.</p>
                            <p className="text-lg font-bold text-[#0eb553]">+ R$ {gcEstimatedProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Card 2: Diesel S-10 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ring-1 ring-yellow-400/30">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-amber-50/30">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                        <span className="font-bold text-sm">DS</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-none">Diesel S-10</h3>
                        <p className="text-xs text-gray-400 mt-1">Tanque 03 • Bomba 01, 04</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-600 border border-yellow-100">
                        <AlertTriangle size={14} />
                        Margem Baixa
                    </span>
                </div>
            </div>

            {/* Card Body Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Custos */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Banknote size={14} /> Custos
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Custo Médio/L</span>
                            <span className="font-bold text-gray-900">R$ 6,10</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Desp. Oper./L</span>
                            <span className="font-bold text-gray-900">R$ 0,40</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Custo Total/L</span>
                            <span className="font-bold text-red-500">R$ 6,50</span>
                        </div>
                    </div>
                </div>

                {/* Venda */}
                <div className="space-y-3 md:pl-6 pt-4 md:pt-0">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Tag size={14} /> Venda
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Preço Atual/L</span>
                            <span className="font-bold text-gray-900 text-lg">R$ 6,65</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Vendas Mês</span>
                            <span className="font-bold text-gray-900">28.150 L</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Receita Bruta</span>
                            <span className="font-bold text-gray-900">R$ 187.197</span>
                        </div>
                    </div>
                </div>

                {/* Margem e Lucro */}
                <div className="space-y-3 md:pl-6 pt-4 md:pt-0">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Coins size={14} /> Margem e Lucro
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Margem Bruta</span>
                            <span className="font-bold text-gray-900">R$ 0,55</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Margem Líq./L</span>
                            <span className="font-bold text-yellow-500">+ R$ 0,15</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500 font-bold">Lucro Total</span>
                            <span className="font-bold text-yellow-500 text-lg">R$ 4.222</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulator Footer */}
            <div className="px-6 py-4 bg-yellow-50/50 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-gray-900 block">Simulador de Preço (Margem Desejada)</label>
                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                <Info size={14} /> Atual: {dsMargin}% (Mínimo: 8%)
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="15" 
                            step="0.1" 
                            value={dsMargin}
                            onChange={(e) => setDsMargin(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500" 
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>0%</span>
                            <span>7.5%</span>
                            <span>15%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto bg-white p-3 rounded-lg border border-gray-200 shadow-sm ring-1 ring-yellow-400/50">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Preço Sugerido ({dsMargin}%)</p>
                            <p className="text-lg font-bold text-gray-900">R$ {dsSuggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="h-8 w-px bg-gray-200"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Lucro Est.</p>
                            <p className="text-lg font-bold text-[#0eb553]">+ R$ {dsEstimatedProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Bottom Grid: Table and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profitability Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">Comparativo de Lucratividade</h3>
                <span className="text-xs text-gray-500">Ranking por margem líquida</span>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#f6f8f7] text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-3">Produto</th>
                            <th className="px-6 py-3 text-right">Vendas (L)</th>
                            <th className="px-6 py-3 text-right">Margem Líq.</th>
                            <th className="px-6 py-3 text-right">Lucro Total</th>
                            <th className="px-6 py-3 text-center">% Part.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {PROFITABILITY_DATA.map((item) => (
                            <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.warning ? 'bg-red-50/50' : ''}`}>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`size-2 rounded-full ${item.color}`}></div>
                                        <span className="font-medium text-gray-900">{item.product}</span>
                                        {item.warning && <AlertTriangle size={14} className="text-yellow-500 ml-1" />}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right text-gray-500">{item.salesVolume.toLocaleString('pt-BR')}</td>
                                <td className={`px-6 py-3 text-right font-medium ${item.warning ? 'text-yellow-600' : 'text-green-600'}`}>
                                    R$ {item.netMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-gray-900">R$ {item.totalProfit.toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-3">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.sharePercentage}%` }}></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Evolution Chart */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-6">
            <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-900">Evolução de Margem</h3>
                <p className="text-sm text-gray-500">Média ponderada - Últimos 6 meses</p>
            </div>
            
            <div className="flex-1 flex items-end gap-3 h-52 w-full pt-4 relative">
                {/* Background grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 pb-6">
                    <div className="w-full border-b border-dashed border-gray-100 h-0"></div>
                    <div className="w-full border-b border-dashed border-gray-100 h-0"></div>
                    <div className="w-full border-b border-dashed border-gray-100 h-0"></div>
                    <div className="w-full border-b border-gray-200 h-0"></div>
                </div>

                {[
                    { month: 'Jul', val: 6.2, height: '40%' },
                    { month: 'Ago', val: 8.5, height: '55%' },
                    { month: 'Set', val: 0, height: '50%', isZero: true }, // Placeholder logic for visual bar
                    { month: 'Out', val: 0, height: '65%', isZero: true },
                    { month: 'Nov', val: 11.2, height: '75%' },
                    { month: 'Dez', val: 10.1, height: '70%', isCurrent: true },
                ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 z-10 group relative h-full justify-end">
                        <div className={`w-full bg-[#13ec6d]/20 rounded-t-sm group-hover:bg-[#13ec6d]/30 transition-all relative`} style={{ height: item.height }}>
                            {!item.isZero && (
                                <>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">{item.val}%</div>
                                    {/* Simulated "candlestick" or inner bar effect from image */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-[#13ec6d] rounded-t-sm" style={{ top: '50%' }}></div>
                                </>
                            )}
                             {item.isZero && (
                                <div className="absolute bottom-0 left-0 right-0 bg-[#13ec6d] rounded-t-sm" style={{ top: '60%' }}></div>
                             )}
                        </div>
                        <span className={`text-xs font-medium ${item.isCurrent ? 'text-[#13ec6d] font-bold' : 'text-gray-400'}`}>{item.month}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <p className="text-xs text-gray-500">Média Atual</p>
                    <p className="text-xl font-bold text-gray-900">10.1%</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
                        <ArrowUp size={16} />
                        <span>1.2%</span>
                    </div>
                    <p className="text-[10px] text-gray-400">vs. Mês anterior</p>
                </div>
            </div>
        </div>

      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
            <p className="text-xs text-gray-400 hidden sm:block">
                Dados atualizados com base no fechamento de caixa de ontem (23:59).
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm font-bold hover:bg-gray-50 transition-colors">
                    <HelpCircle size={20} />
                    Ajuda
                </button>
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0d1b13] text-white text-sm font-bold hover:bg-black transition-colors shadow-lg">
                    <Save size={20} />
                    Salvar Simulação
                </button>
            </div>
        </div>
      </div>

    </div>
  );
};

export default CostAnalysisScreen;