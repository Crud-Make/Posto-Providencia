import React, { useState, useEffect } from 'react';
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
    Fuel,
    Loader2
} from 'lucide-react';
import { fetchProfitabilityData } from '../services/api';
import { usePosto } from '../contexts/PostoContext';


const TelaAnaliseCustos: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);

    const [data, setData] = useState<any[]>([]);
    const [margins, setMargins] = useState<Record<number, number>>({});
    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = async (date: Date) => {
        try {
            setLoading(true);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const result = await fetchProfitabilityData(year, month, postoAtivoId);
            setData(result);


            // Inicializa margens simuladas com a margem bruta real
            const initialMargins: Record<number, number> = {};
            result.forEach(item => {
                const currentMarginPercent = item.precoVenda > 0 ? (item.margemBrutaL / item.precoVenda) * 100 : 0;
                initialMargins[item.combustivelId] = Math.max(0, Math.round(currentMarginPercent * 10) / 10);
            });
            setMargins(initialMargins);
        } catch (error) {
            console.error("Erro ao carregar dados de lucratividade:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(currentDate);
    }, [currentDate, postoAtivoId]);


    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const exportToCSV = () => {
        if (!data.length) return;

        const headers = ["Produto", "Custo Médio", "Despesa/L", "Custo Total/L", "Preço Atual", "Volume (L)", "Receita", "Lucro Total", "Margem Líquida"];
        const rows = data.map(item => [
            item.nome,
            item.custoMedio.toFixed(2),
            item.despOperacional.toFixed(2),
            item.custoTotalL.toFixed(2),
            item.precoVenda.toFixed(2),
            item.volumeVendido.toFixed(0),
            item.receitaBruta.toFixed(2),
            item.lucroTotal.toFixed(2),
            item.margemLiquidaL.toFixed(2)
        ]);

        const content = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `analise-custo-${currentDate.toISOString().slice(0, 7)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleApplyPrices = async () => {
        // Implementation for applying new prices to the database
        alert("Funcionalidade de atualização de preços em massa está sendo integrada com o serviço de combustível.");
    };

    // Calculation helpers
    const calculatePrice = (cost: number, marginPercent: number) => {
        if (marginPercent >= 100) return cost * 10;
        return cost / (1 - (marginPercent / 100));
    };

    const calculateProfit = (suggestedPrice: number, costTotalL: number, volume: number) => {
        return (suggestedPrice - costTotalL) * volume;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-[#13ec6d]">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Analisando dados financeiros...</p>
            </div>
        );
    }

    // Prepara dados para a tabela de ranking
    const totalProfitSum = data.reduce((acc, item) => acc + (item.lucroTotal || 0), 0);
    const sortedData = [...data].sort((a, b) => (b.margemLiquidaL || 0) - (a.margemLiquidaL || 0));

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#13ec6d]/10 text-[#0eb553] border border-[#13ec6d]/20">Financeiro</span>
                        <span className="text-xs text-gray-400">Análise Mensal Real</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">Análise de Custo e Margem</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">Gerencie a lucratividade por combustível, simule preços e monitore margens líquidas.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 shadow-sm h-10">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2 px-3 border-x border-gray-100 dark:border-gray-700 mx-1">
                            <Calendar size={18} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).slice(1)}
                            </span>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => alert('Para configurar a despesa operacional, acesse:\n\nMenu → Configurações → Configurações Financeiras\n\nLá você pode ajustar o valor de R$/litro aplicado nos cálculos de margem líquida.')}
                        className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <Settings size={20} />
                        <span>Configurar Despesas</span>
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[#13ec6d] text-[#0d1b13] text-sm font-bold hover:bg-[#13ec6d]/90 transition-colors shadow-sm shadow-[#13ec6d]/20"
                    >
                        <Download size={20} />
                        <span>Exportar Relatório</span>
                    </button>
                </div>
            </div>

            {/* Main Grid: Analysis Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {data.map((item) => {
                    const currentMargin = margins[item.combustivelId] || 0;
                    const suggestedPrice = calculatePrice(item.custoMedio, currentMargin);
                    const estimatedProfit = calculateProfit(suggestedPrice, item.custoTotalL, item.volumeVendido);

                    return (
                        <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col ${item.margemLiquidaL < 0.2 ? 'ring-1 ring-yellow-400/30' : ''}`}>
                            {/* Card Header */}
                            <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${item.margemLiquidaL < 0.2 ? 'bg-amber-50/30 dark:bg-amber-900/20' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-lg flex items-center justify-center font-bold text-sm`} style={{ backgroundColor: `${item.cor}20`, color: item.cor }}>
                                        {item.codigo}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-none">{item.nome}</h3>
                                        <p className="text-xs text-gray-400 mt-1">Estoque atualizado • {new Date().toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${item.margemLiquidaL >= 0.5 ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                                        {item.margemLiquidaL >= 0.5 ? <TrendingUp size={14} /> : <AlertTriangle size={14} />}
                                        {item.margemLiquidaL >= 0.5 ? 'Margem Saudável' : 'Margem Baixa'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Body Grid */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
                                {/* Custos */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <Banknote size={14} /> Custos
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Custo Médio/L</span>
                                            <span className="font-bold text-gray-900 dark:text-white">R$ {item.custoMedio.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Desp. Oper./L</span>
                                            <span className="font-bold text-gray-900 dark:text-white">R$ {item.despOperacional.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold">Custo Total/L</span>
                                            <span className="font-bold text-red-500">R$ {item.custoTotalL.toFixed(2)}</span>
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
                                            <span className="text-gray-500 dark:text-gray-400">Preço Atual/L</span>
                                            <span className="font-bold text-gray-900 dark:text-white text-lg">R$ {item.precoVenda.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Vendas Mês</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{item.volumeVendido.toLocaleString('pt-BR')} L</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold">Receita Bruta</span>
                                            <span className="font-bold text-gray-900 dark:text-white">R$ {item.receitaBruta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
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
                                            <span className="text-gray-500 dark:text-gray-400">Margem Bruta</span>
                                            <span className="font-bold text-gray-900 dark:text-white">R$ {item.margemBrutaL.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Margem Líq./L</span>
                                            <span className={`font-bold ${item.margemLiquidaL > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.margemLiquidaL > 0 ? '+' : ''} R$ {item.margemLiquidaL.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold">Lucro Total</span>
                                            <span className={`font-bold text-lg ${item.lucroTotal > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                R$ {item.lucroTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Simulator Footer */}
                            <div className={`px-6 py-4 border-t border-gray-100 dark:border-gray-700 ${item.margemLiquidaL < 0.2 ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : 'bg-[#13ec6d]/5 dark:bg-[#13ec6d]/10'}`}>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex-1 w-full">
                                        <label className="text-xs font-bold text-gray-900 dark:text-white mb-2 block">
                                            Simulador de Preço (Margem Desejada: <span>{currentMargin}</span>%)
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="30"
                                            step="0.1"
                                            value={currentMargin}
                                            onChange={(e) => setMargins(prev => ({ ...prev, [item.combustivelId]: parseFloat(e.target.value) }))}
                                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${item.margemLiquidaL < 0.2 ? 'accent-yellow-500' : 'accent-[#13ec6d]'}`}
                                        />
                                    </div>
                                    <div className={`flex items-center gap-4 w-full sm:w-auto bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm ${item.margemLiquidaL < 0.2 ? 'ring-1 ring-yellow-400/50' : ''}`}>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Preço Sugerido</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">R$ {suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200"></div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Lucro Est.</p>
                                            <p className={`text-lg font-bold ${estimatedProfit > 0 ? 'text-[#0eb553]' : 'text-red-500'}`}>
                                                {estimatedProfit > 0 ? '+' : ''} R$ {estimatedProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

            </div>

            {/* Bottom Grid: Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profitability Ranking Table */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ranking de Lucratividade</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Participação no lucro total do mês</span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#f6f8f7] dark:bg-gray-700 text-gray-400 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-6 py-3">Produto</th>
                                    <th className="px-6 py-3 text-right">Vendas (L)</th>
                                    <th className="px-6 py-3 text-right">Margem Líq.</th>
                                    <th className="px-6 py-3 text-right">Lucro Total</th>
                                    <th className="px-6 py-3 text-center">% Part. Lucro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedData.map((item) => {
                                    const share = totalProfitSum > 0 ? (item.lucroTotal / totalProfitSum) * 100 : 0;
                                    return (
                                        <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${item.margemLiquidaL < 0.2 ? 'bg-red-50/30 dark:bg-red-900/20' : ''}`}>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`size-2 rounded-full`} style={{ backgroundColor: item.cor }}></div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{item.nome}</span>
                                                    {item.margemLiquidaL < 0.2 && <AlertTriangle size={14} className="text-yellow-500 ml-1" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{item.volumeVendido.toLocaleString('pt-BR')}</td>
                                            <td className={`px-6 py-3 text-right font-medium ${item.margemLiquidaL < 0.2 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                R$ {item.margemLiquidaL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-white">R$ {item.lucroTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                                            <td className="px-6 py-3 px-10">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                                        <div className="h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, share))}%`, backgroundColor: item.cor }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 w-8">{Math.max(0, share).toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col p-6">
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Resumo Econômico</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Mês vigente vs. Custos Médios</p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Lucro Operacional Total</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">R$ {totalProfitSum.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                            <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                                <ArrowUp size={16} />
                                <span>Calculado via PEPS/Custo Médio</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase font-bold">Volume Total</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.reduce((acc, i) => acc + i.volumeVendido, 0).toLocaleString('pt-BR')} L</p>
                            </div>
                            <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                <p className="text-[10px] text-purple-500 dark:text-purple-400 uppercase font-bold">Receita Bruta</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">R$ {(data.reduce((acc, i) => acc + i.receitaBruta, 0) / 1000).toFixed(0)}k</p>
                            </div>
                        </div>

                        <div className="p-4 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                <Info size={14} className="text-blue-500" />
                                Base de Cálculo
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                As margens exibidas consideram o <strong>Custo Médio Ponderado</strong> de estoque e o rateio real das despesas registradas no mês.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
                    <p className="text-xs text-gray-400 hidden sm:block">
                        Dados processados em tempo real com base no histórico de leituras e notas fiscais de entrada.
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <HelpCircle size={20} />
                            Ajuda
                        </button>
                        <button
                            onClick={handleApplyPrices}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0d1b13] text-white text-sm font-bold hover:bg-black transition-colors shadow-lg"
                        >
                            <Save size={20} />
                            Aplicar Novos Preços
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TelaAnaliseCustos;