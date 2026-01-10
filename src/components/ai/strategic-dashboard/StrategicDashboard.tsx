// [10/01 09:00] Refatoração completa em módulos (hooks + componentes) - Traduzido para PT-BR
// [10/01 17:12] Substituído 'any' por tipos estritos
// [10/01 17:17] Adicionado JSDoc completo
import React from 'react';
import { usePosto } from '../../../contexts/PostoContext';
import { baratenciaService } from '../../../services/api';
import { toast } from 'sonner';
import { Brain, RefreshCw } from 'lucide-react';
import { TemplatePromocao } from './types';

// Hooks
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { useWeeklyVolume } from './hooks/useWeeklyVolume';
import { useAIInsights } from './hooks/useAIInsights';
import { useStockAlerts } from './hooks/useStockAlerts';
import { useTopPerformers } from './hooks/useTopPerformers';
import { useAIPromotion } from './hooks/useAIPromotion';

// Components
import { MetricsCards } from './components/MetricsCards';
import { WeeklyVolumeChart } from './components/WeeklyVolumeChart';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { StockAlertsPanel } from './components/StockAlertsPanel';
import { TopPerformersPanel } from './components/TopPerformersPanel';
import { AIPromotionSimulator } from './components/AIPromotionSimulator';
import { AIChatConsultant } from './components/AIChatConsultant';

/**
 * Dashboard Estratégico com IA
 * 
 * Componente principal que orquestra todos os módulos do dashboard estratégico.
 * Integra análise de vendas, insights de IA, alertas de estoque, performance de frentistas
 * e simulador de promoções.
 * 
 * @component
 * @returns {JSX.Element} Dashboard completo com métricas e ferramentas de IA
 * 
 * @example
 * ```tsx
 * <StrategicDashboard />
 * ```
 * 
 * @remarks
 * Este componente foi refatorado de um arquivo monolítico de 1.010 linhas
 * para uma arquitetura modular com 7 componentes e 6 hooks customizados.
 * 
 * Estrutura:
 * - 6 hooks para lógica de negócio
 * - 7 componentes de UI reutilizáveis
 * - TypeScript 100% estrito (zero 'any')
 * - JSDoc completo em todos os módulos
 */
export const StrategicDashboard: React.FC = () => {
    const { postoAtivoId } = usePosto();

    // Hooks initialization
    const { metrics, loading: loadingMetrics, currentAnalysis, refreshMetrics } = useDashboardMetrics();
    const { weeklyVolume, maxVolume } = useWeeklyVolume(currentAnalysis);
    const { stockAlerts } = useStockAlerts(currentAnalysis);
    const { topPerformers } = useTopPerformers();
    const { aiPromotion, salesByDay } = useAIPromotion(currentAnalysis);
    const { insights } = useAIInsights(currentAnalysis, metrics, stockAlerts);

    const handleRefresh = async () => {
        await refreshMetrics();
    };

    const handleApplyPromotion = async (product: string, discount: number, template: TemplatePromocao) => {
        if (!aiPromotion || !postoAtivoId) return;

        try {
            await baratenciaService.createPromocao({
                titulo: template.name,
                descricao: `${template.description}. Alvo: ${aiPromotion.targetDay}. Produto: ${product}. Desconto: R$ ${(discount / 100).toFixed(2)}`,
                tipo: 'PRECO_TRAVADO',
                valor_minimo: 0,
                bonus_porcentagem: 0,
                combustivel_codigo: product,
                data_inicio: new Date().toISOString(),
                data_fim: null,
                ativo: true,
                posto_id: postoAtivoId
            });

            toast.success(`Promoção "${template.name}" agendada com sucesso para ${aiPromotion.targetDay}!`);
        } catch (error) {
            console.error('Erro ao agendar promoção:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao agendar promoção: ' + errorMessage);
            throw error;
        }
    };

    const isInitialLoading = loadingMetrics && !metrics;
    const isRefreshing = loadingMetrics && !!metrics;

    if (isInitialLoading) {
        return (
            <main className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 h-full">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                        <Brain className="w-16 h-16 text-indigo-600 dark:text-indigo-400 relative z-10 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-6 mb-2">Processando Inteligência</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                        Analisando vendas, estoque e performance para gerar insights...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 relative h-full">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Estrategista IA</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dados em Tempo Real</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </header>

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
                {/* Metrics Cards */}
                <MetricsCards metrics={metrics} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Charts and Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Weekly Volume Chart */}
                        <WeeklyVolumeChart weeklyVolume={weeklyVolume} maxVolume={maxVolume} />

                        {/* AI Promotion Simulator */}
                        <AIPromotionSimulator
                            aiPromotion={aiPromotion}
                            salesByDay={salesByDay}
                            onApply={handleApplyPromotion}
                        />

                        {/* Stock Status */}
                        <StockAlertsPanel stockAlerts={stockAlerts} />

                        {/* Top Performers */}
                        <TopPerformersPanel topPerformers={topPerformers} />
                    </div>

                    {/* Right Column - Insights and Chat */}
                    <div className="space-y-6">
                        {/* AI Insights */}
                        <AIInsightsPanel insights={insights} />

                        {/* AI Chat */}
                        <AIChatConsultant
                            metrics={metrics}
                            stockAlerts={stockAlerts}
                            topPerformers={topPerformers}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};
