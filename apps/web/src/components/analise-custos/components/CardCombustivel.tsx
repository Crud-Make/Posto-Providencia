import React from 'react';
import { TrendingUp, AlertTriangle, Banknote, Tag, Coins } from 'lucide-react';
import { ProfitabilityItem } from '../types';

interface CardCombustivelProps {
    item: ProfitabilityItem;
    currentMargin: number;
    onMarginChange: (value: number) => void;
    calculatePrice: (cost: number, margin: number) => number;
    calculateProfit: (price: number, cost: number, volume: number) => number;
}

const CardCombustivel: React.FC<CardCombustivelProps> = ({
    item,
    currentMargin,
    onMarginChange,
    calculatePrice,
    calculateProfit
}) => {
    const suggestedPrice = calculatePrice(item.custoMedio, currentMargin);
    const estimatedProfit = calculateProfit(suggestedPrice, item.custoTotalL, item.volumeVendido);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col ${item.margemLiquidaL < 0.2 ? 'ring-1 ring-yellow-400/30' : ''}`}>
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
                            onChange={(e) => onMarginChange(parseFloat(e.target.value))}
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
};

export default CardCombustivel;
