import React, { useEffect, useState } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { aiService, AIInsight } from '../../services/aiService';
import {
    Server,
    TrendingUp,
    AlertTriangle,
    Zap,
    Target,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    BrainCircuit,
    Lightbulb,
    Settings,
    X,
    Key,
    Save
} from 'lucide-react';
import { toast } from 'sonner';

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => {
    const severityStyles = {
        info: {
            bg: 'bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900',
            border: 'border-blue-100 dark:border-blue-900',
            text: 'text-blue-900 dark:text-blue-100',
            icon: 'text-blue-600 dark:text-blue-400',
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        },
        success: {
            bg: 'bg-gradient-to-br from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900',
            border: 'border-emerald-100 dark:border-emerald-900',
            text: 'text-emerald-900 dark:text-emerald-100',
            icon: 'text-emerald-600 dark:text-emerald-400',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
        },
        warning: {
            bg: 'bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900',
            border: 'border-amber-100 dark:border-amber-900',
            text: 'text-amber-900 dark:text-amber-100',
            icon: 'text-amber-600 dark:text-amber-400',
            badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
        },
        critical: {
            bg: 'bg-gradient-to-br from-red-50 to-white dark:from-gray-800 dark:to-gray-900',
            border: 'border-red-100 dark:border-red-900',
            text: 'text-red-900 dark:text-red-100',
            icon: 'text-red-600 dark:text-red-400',
            badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        },
    };

    const styles = severityStyles[insight.severity];

    const iconMap = {
        info: <Lightbulb className={`w-5 h-5 ${styles.icon}`} />,
        success: <TrendingUp className={`w-5 h-5 ${styles.icon}`} />,
        warning: <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />,
        critical: <Zap className={`w-5 h-5 ${styles.icon}`} />,
    };

    return (
        <div className={`p-5 rounded-2xl border ${styles.border} ${styles.bg} shadow-sm hover:shadow-lg transition-all duration-300 group`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ring-1 ring-black/5`}>
                        {iconMap[insight.severity]}
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm uppercase tracking-wide opacity-80 ${styles.text}`}>
                            {insight.title}
                        </h3>
                    </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${styles.badge}`}>
                    {insight.type === 'macro_vision' ? 'Visão 360º' : insight.type === 'promotion' ? 'Oportunidade' : 'Performance'}
                </span>
            </div>

            <p className="text-gray-700 dark:text-gray-300 text-base font-medium mb-5 leading-relaxed">
                {insight.description}
            </p>

            {insight.metrics && insight.metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {insight.metrics.map((metric, idx) => (
                        <div key={idx} className="bg-white/50 dark:bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">{metric.label}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{metric.value}</span>
                                {metric.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                                {metric.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {insight.action && (
                <button
                    onClick={() => toast.success(`Ação iniciada: ${insight.action?.label}`)}
                    className="w-full py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 shadow-sm text-gray-700 dark:text-gray-200 hover:scale-[1.02] active:scale-95"
                >
                    <Target className="w-4 h-4 text-indigo-500" />
                    {insight.action.label}
                </button>
            )}
        </div>
    );
};

const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [openAiKey, setOpenAiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');

    useEffect(() => {
        setOpenAiKey(localStorage.getItem('openai_api_key') || '');
        setGeminiKey(localStorage.getItem('gemini_api_key') || '');
    }, []);

    const handleSave = () => {
        localStorage.setItem('openai_api_key', openAiKey);
        localStorage.setItem('gemini_api_key', geminiKey);
        toast.success('Chaves de API salvas com sucesso!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md m-4 border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Settings size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações da IA</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Insira suas chaves de API para habilitar os recursos avançados de geração de texto e insights profundos.
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Key size={14} /> OpenAI API Key
                            </label>
                            <input
                                type="password"
                                value={openAiKey}
                                onChange={(e) => setOpenAiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <BrainCircuit size={14} /> Gemini API Key
                            </label>
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                placeholder="AIza..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2">
                        <Save size={16} /> Salvar Chaves
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StrategicDashboard: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const loadAI = async () => {
            if (!postoAtivoId) return;
            setLoading(true);
            try {
                // Determine if we have API keys to potentially use more advanced logic later
                const hasGemini = !!localStorage.getItem('gemini_api_key');
                if (hasGemini) {
                    // In the future, we could pass this to the service
                    // console.log("Using Advanced AI Mode");
                }

                const health = await aiService.analyzeBusinessHealth(postoAtivoId);
                const promos = await aiService.generatePromotionSuggestions(postoAtivoId);
                const perf = await aiService.optimizePerformance(postoAtivoId);

                setInsights([...health, ...promos, ...perf]);
            } catch (error) {
                console.error("AI Brain Freeze:", error);
            } finally {
                setLoading(false);
            }
        };
        loadAI();
    }, [postoAtivoId]);

    const macroInsights = insights.filter(i => i.type === 'macro_vision');
    const promoInsights = insights.filter(i => i.type === 'promotion');
    const perfInsights = insights.filter(i => i.type === 'performance');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <BrainCircuit className="w-16 h-16 text-indigo-600 dark:text-indigo-400 relative z-10 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-6 mb-2">Processando Inteligência</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                    Nossos algoritmos estão cruzando milhões de dados de vendas, estoque e performance para gerar insights valiosos.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 lg:p-10 space-y-12 animate-fade-in-up">
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none text-white ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                        <BrainCircuit size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
                            Estrategista IA <span className="text-indigo-600 text-lg align-top ml-1">BETA</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
                            Inteligência preditiva para maximizar lucros e eficiência.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-semibold border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                    <Settings size={18} />
                    Configurar Modelos
                </button>
            </header>

            {/* Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

                {/* Main Column: Macro Vision */}
                <div className="xl:col-span-1 space-y-8">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                        <Server className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Saúde do Negócio</h2>
                    </div>

                    <div className="grid gap-6">
                        {macroInsights.length > 0 ? (
                            macroInsights.map(insight => <InsightCard key={insight.id} insight={insight} />)
                        ) : (
                            <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Target className="text-green-500" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 font-medium">Tudo Operando Normalmente</p>
                                <p className="text-sm text-gray-400 mt-1">Nenhum alerta crítico detectado no momento.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Column: Promos & Performance */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Offers Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Oportunidades</h2>
                        </div>
                        <div className="space-y-6">
                            {promoInsights.length > 0 ? (
                                promoInsights.map(insight => <InsightCard key={insight.id} insight={insight} />)
                            ) : (
                                <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center opacity-70 hover:opacity-100 transition-opacity">
                                    <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Sem sugestões de promoção.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Performance Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
                            <Users className="w-5 h-5 text-amber-500" />
                            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Performance</h2>
                        </div>
                        <div className="space-y-6">
                            {perfInsights.length > 0 ? (
                                perfInsights.map(insight => <InsightCard key={insight.id} insight={insight} />)
                            ) : (
                                <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center opacity-70 hover:opacity-100 transition-opacity">
                                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Dados insuficientes para análise.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
