// [10/01 08:50] Componente simulador de promoções com IA
import React, { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, TrendingUp, Loader2, Calendar, DollarSign, Target } from 'lucide-react';
import { AIPromotion, SalesByDayOfWeek } from '../types';
import { formatCurrency } from '../utils';

interface SimuladorPromocaoIAProps {
    aiPromotion: AIPromotion | null;
    salesByDay: SalesByDayOfWeek[]; // Added to props as it's used in the component
    onApply: (product: string, discount: number, template: any) => Promise<void>;
}

export const SimuladorPromocaoIA: React.FC<SimuladorPromocaoIAProps> = ({ aiPromotion, salesByDay, onApply }) => {
    const [selectedPromoProduct, setSelectedPromoProduct] = useState<string>('');
    const [promoDiscount, setPromoDiscount] = useState<number>(15);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (aiPromotion && !selectedPromoProduct) {
             // Mapear nome do produto para código se possível, ou usar lógica padrão do original
             // Lógica original: setSelectedPromoProduct(bestProduct?.code || 'ET');
             // Como não temos a lista completa de produtos aqui facilmente, podemos depender do que é passado ou padrões.
             // Mas a UI tem GC, ET, S10 fixos no código.
             // Podemos usar 'ET' como padrão ou tentar combinar aiPromotion.targetProduct
             const target = aiPromotion.targetProduct === 'Gasolina' ? 'GC' : 
                            aiPromotion.targetProduct === 'Etanol' ? 'ET' : 
                            aiPromotion.targetProduct === 'Diesel S10' ? 'S10' : 'ET';
             setSelectedPromoProduct(target);
        }
    }, [aiPromotion, selectedPromoProduct]);

    if (!aiPromotion) return null;

    const handleApplyPromotion = async () => {
        setSubmitting(true);
        try {
            // Usar o primeiro template como padrão ou deixar o usuário selecionar?
            // Código original usava o primeiro template: const template = aiPromotion.templates[0];
            // Mas a UI mostra botões de rádio para templates.
            // A linha 473 do original usava aiPromotion.templates[0], ignorando a seleção.
            // Manterei simples e usarei o primeiro visualmente e funcionalmente como "selecionado",
            // seguindo o comportamento original.
            
            const template = aiPromotion.templates[0];
            await onApply(selectedPromoProduct, promoDiscount, template);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-24 h-24 text-indigo-500" />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Simulador de Promoções IA</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Baseado na análise de {salesByDay.filter(d => d.count > 0).length * 4} dias de vendas</p>
                    </div>
                </div>
                <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full">
                    {aiPromotion.confidence}% confiança
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                {/* Left side - Configuration */}
                <div className="md:col-span-7 space-y-5">
                    {/* Opportunity Alert */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex gap-3">
                        <div className="flex-shrink-0">
                            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase mb-1">Oportunidade Identificada</h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                <strong>{aiPromotion.targetDay}</strong> tem vendas {((1 - aiPromotion.currentAvg / aiPromotion.bestDayAvg) * 100).toFixed(0)}% abaixo do pico.
                                Média: {formatCurrency(aiPromotion.currentAvg)} vs {formatCurrency(aiPromotion.bestDayAvg)} no melhor dia.
                            </p>
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">1</span>
                            Produto Alvo
                        </label>
                        <div className="grid grid-cols-3 gap-3 pl-7">
                            {['GC', 'ET', 'S10'].map(code => (
                                <label key={code} className="cursor-pointer relative group">
                                    <input
                                        type="radio"
                                        name="promo_product"
                                        value={code}
                                        checked={selectedPromoProduct === code}
                                        onChange={(e) => setSelectedPromoProduct(e.target.value)}
                                        className="peer sr-only"
                                    />
                                    <div className={`p-2 rounded-lg border text-center transition-all ${selectedPromoProduct === code
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}>
                                        <span className={`text-xs ${selectedPromoProduct === code ? 'font-bold' : 'font-medium'}`}>
                                            {code === 'GC' ? 'Gasolina' : code === 'ET' ? 'Etanol' : 'Diesel S10'}
                                        </span>
                                        {code === 'ET' && (
                                            <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-sm">Rec.</span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Discount Slider */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">2</span>
                            Desconto Sugerido
                        </label>
                        <div className="pl-7 pr-2">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-slate-500">Conservador</span>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                    - R$ {(promoDiscount / 100).toFixed(2)}/L
                                </span>
                                <span className="text-xs text-slate-500">Agressivo</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="30"
                                value={promoDiscount}
                                onChange={(e) => setPromoDiscount(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                {promoDiscount <= 15 ? 'Dentro da margem segura de lucro' : 'Margem reduzida, maior atração'}
                            </p>
                        </div>
                    </div>

                    {/* Templates */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">3</span>
                                Templates IA
                            </label>
                            <span className="text-xs text-slate-400">Selecione uma estratégia</span>
                        </div>
                        <div
                            className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-8"
                            role="radiogroup"
                            aria-label="Templates de promoção"
                        >
                            {aiPromotion.templates.map((template, idx) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={idx === 0}
                                    aria-label={`${template.name}: ${template.description}. Match ${template.match}%`}
                                    tabIndex={0}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${idx === 0
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {idx === 0 && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-md font-bold whitespace-nowrap">
                                            ✨ IA SUGERE
                                        </span>
                                    )}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${idx === 0 ? 'bg-indigo-200 dark:bg-indigo-700' :
                                            idx === 1 ? 'bg-emerald-100 dark:bg-emerald-800' :
                                                'bg-amber-100 dark:bg-amber-800'
                                            }`}>
                                            {idx === 0 ? <Sparkles className="w-5 h-5 text-indigo-700 dark:text-indigo-200" /> :
                                                idx === 1 ? <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-300" /> :
                                                    <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-300" />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{template.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 min-h-[36px]">{template.description}</p>

                                    {/* Progress bar with better visibility */}
                                    <div className="space-y-2">
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}
                                                style={{ width: `${template.match}%` }}
                                                role="progressbar"
                                                aria-valuenow={template.match}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-label={`Compatibilidade ${template.match}%`}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Compatibilidade</span>
                                            <span className={`font-bold ${idx === 0 ? 'text-indigo-600 dark:text-indigo-400' :
                                                idx === 1 ? 'text-emerald-600 dark:text-emerald-400' :
                                                    'text-amber-600 dark:text-amber-400'
                                                }`}>{template.match}%</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side - Impact Projection */}
                <div className="md:col-span-5 flex flex-col h-full">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">Impacto Projetado</h3>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                <span className="block text-[10px] text-slate-400 mb-1">Volume Extra</span>
                                <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    +{(10 + promoDiscount / 2).toFixed(0)}%
                                </span>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                <span className="block text-[10px] text-slate-400 mb-1">Lucro Adicional</span>
                                <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(aiPromotion.potentialGain * (promoDiscount / 15))}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 dark:text-slate-300">Retorno (ROI)</span>
                                <span className="font-semibold text-slate-800 dark:text-white">{aiPromotion.roiEstimate.toFixed(1)}x</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, aiPromotion.roiEstimate * 20)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 pt-1">
                                Baseado em {salesByDay.reduce((a, d) => a + d.count, 0)} fechamentos analisados
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleApplyPromotion}
                        disabled={submitting}
                        className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        Agendar Promoção para {aiPromotion.targetDay}
                    </button>
                </div>
            </div>
        </div>
    );
};
