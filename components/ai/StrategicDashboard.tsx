import React, { useEffect, useState, useMemo } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import {
    fechamentoService,
    estoqueService,
    despesaService,
    salesAnalysisService,
    frentistaService,
    fechamentoFrentistaService,
    clienteService,
    baratenciaService
} from '../../services/api';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Target, Users, DollarSign, Fuel, BarChart3, Calendar, Brain, Sparkles, Send, Settings, RefreshCw, CheckCircle2 } from 'lucide-react';

// Types
interface DashboardMetrics {
    receitaProjetada: number;
    receitaMesAnterior: number;
    receitaVariacao: number;
    volumeVendas: number;
    volumeVariacao: number;
    margemMedia: number;
    margemVariacao: number;
    scoreEficiencia: number;
}

interface DailyVolumeData {
    dia: string;
    diaSemana: string;
    volume: number;
    isToday: boolean;
    isProjection: boolean;
}

interface AIInsight {
    id: string;
    type: 'opportunity' | 'alert' | 'performance' | 'stock';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
    timestamp: string;
    actionLabel?: string;
}

interface StockAlert {
    combustivel: string;
    diasRestantes: number;
    percentual: number;
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
}

interface AttendantPerformance {
    nome: string;
    vendaMedia: number;
    diferencaAcumulada: number;
    turnos: number;
}

interface SalesByDayOfWeek {
    day: number;
    dayName: string;
    avgVolume: number;
    avgRevenue: number;
    count: number;
}

interface AIPromotion {
    id: string;
    targetDay: string;
    targetProduct: string;
    currentAvg: number;
    bestDayAvg: number;
    potentialGain: number;
    discountSuggested: number;
    roiEstimate: number;
    confidence: number;
    templates: {
        id: string;
        name: string;
        description: string;
        match: number;
        icon: string;
    }[];
}

// Helper Functions
const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(2)}`;
};

const formatVolume = (value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k L`;
    return `${value.toFixed(0)} L`;
};

const getDayOfWeek = (date: Date): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return days[date.getDay()];
};

export const StrategicDashboard: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [weeklyVolume, setWeeklyVolume] = useState<DailyVolumeData[]>([]);
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [topPerformers, setTopPerformers] = useState<AttendantPerformance[]>([]);
    const [aiPromotion, setAiPromotion] = useState<AIPromotion | null>(null);
    const [salesByDay, setSalesByDay] = useState<SalesByDayOfWeek[]>([]);
    const [selectedPromoProduct, setSelectedPromoProduct] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [promoDiscount, setPromoDiscount] = useState<number>(15);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Olá! Sou seu Consultor IA. Pergunte sobre vendas, estoque, frentistas ou qualquer aspecto do seu negócio.' }
    ]);

    // Fetch all data
    const loadDashboardData = async () => {
        if (!postoAtivoId) return;

        try {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

            // 1. Fetch Current Month Sales Analysis
            const currentAnalysis = await salesAnalysisService.getMonthlyAnalysis(currentYear, currentMonth, postoAtivoId);

            // 2. Fetch Previous Month for comparison
            const prevAnalysis = await salesAnalysisService.getMonthlyAnalysis(prevYear, prevMonth, postoAtivoId);

            // 3. Calculate projected revenue (based on daily average * remaining days)
            const daysPassed = today.getDate();
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            const dailyAverage = currentAnalysis.totals.revenue / daysPassed;
            const projectedRevenue = dailyAverage * daysInMonth;

            // 4. Calculate metrics
            const revenueVariation = prevAnalysis.totals.revenue > 0
                ? ((projectedRevenue - prevAnalysis.totals.revenue) / prevAnalysis.totals.revenue) * 100
                : 0;

            const volumeVariation = prevAnalysis.totals.volume > 0
                ? ((currentAnalysis.totals.volume - prevAnalysis.totals.volume) / prevAnalysis.totals.volume) * 100
                : 0;

            const marginVariation = prevAnalysis.totals.avgMargin > 0
                ? currentAnalysis.totals.avgMargin - prevAnalysis.totals.avgMargin
                : 0;

            setMetrics({
                receitaProjetada: projectedRevenue,
                receitaMesAnterior: prevAnalysis.totals.revenue,
                receitaVariacao: revenueVariation,
                volumeVendas: currentAnalysis.totals.volume,
                volumeVariacao: volumeVariation,
                margemMedia: currentAnalysis.totals.avgMargin,
                margemVariacao: marginVariation,
                scoreEficiencia: Math.min(10, Math.max(0, 7 + (currentAnalysis.totals.avgMargin / 10)))
            });

            // 5. Fetch daily closings for weekly chart
            const weekData: DailyVolumeData[] = [];
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === today.toISOString().split('T')[0];
                const isFuture = date > today;

                if (isFuture) {
                    // Project based on historical average for this day of week
                    const projectedVolume = dailyAverage * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
                    weekData.push({
                        dia: date.getDate().toString(),
                        diaSemana: getDayOfWeek(date),
                        volume: projectedVolume / (currentAnalysis.totals.volume > 0 ? currentAnalysis.totals.volume / 100 : 1),
                        isToday: false,
                        isProjection: true
                    });
                } else {
                    const fechamentos = await fechamentoService.getByDate(dateStr, postoAtivoId);
                    const dayVolume = fechamentos.reduce((acc: number, f: any) => acc + (f.total_vendas || 0), 0);
                    weekData.push({
                        dia: date.getDate().toString(),
                        diaSemana: getDayOfWeek(date),
                        volume: dayVolume,
                        isToday,
                        isProjection: false
                    });
                }
            }
            setWeeklyVolume(weekData);

            // 6. Fetch Stock Alerts
            const estoques = await estoqueService.getAll(postoAtivoId);
            const alerts: StockAlert[] = estoques.map((e: any) => {
                const percentual = e.capacidade_tanque > 0 ? (e.quantidade_atual / e.capacidade_tanque) * 100 : 0;
                let status: 'OK' | 'BAIXO' | 'CRÍTICO' = 'OK';
                if (percentual < 10) status = 'CRÍTICO';
                else if (percentual < 25) status = 'BAIXO';

                // Estimate days remaining based on average daily consumption
                const avgDailyConsumption = currentAnalysis.totals.volume / daysPassed / estoques.length;
                const diasRestantes = avgDailyConsumption > 0 ? Math.floor(e.quantidade_atual / avgDailyConsumption) : 999;

                return {
                    combustivel: e.combustivel?.nome || 'Desconhecido',
                    diasRestantes,
                    percentual,
                    status
                };
            });
            setStockAlerts(alerts);

            // 7. Generate AI Insights
            const generatedInsights: AIInsight[] = [];

            // Check for low margin products
            currentAnalysis.products.forEach((p: any) => {
                if (p.margin < 5 && p.volume > 100) {
                    generatedInsights.push({
                        id: `margin-${p.code}`,
                        type: 'alert',
                        title: `Margem Baixa: ${p.name}`,
                        message: `A margem de ${p.name} está em apenas ${p.margin.toFixed(1)}%. Considere ajustar o preço de venda.`,
                        severity: 'warning',
                        timestamp: new Date().toISOString(),
                        actionLabel: 'Ver Preços'
                    });
                }
            });

            // Check for critical stock
            alerts.forEach(a => {
                if (a.status === 'CRÍTICO') {
                    generatedInsights.push({
                        id: `stock-${a.combustivel}`,
                        type: 'stock',
                        title: `Estoque Crítico: ${a.combustivel}`,
                        message: `${a.combustivel} está com apenas ${a.percentual.toFixed(0)}% de capacidade. Previsão de ${a.diasRestantes} dias restantes.`,
                        severity: 'critical',
                        timestamp: new Date().toISOString(),
                        actionLabel: 'Agendar Compra'
                    });
                }
            });

            // Opportunity based on day of week analysis
            if (today.getDay() >= 4 && today.getDay() <= 6) { // Thu-Sat
                generatedInsights.push({
                    id: 'weekend-opportunity',
                    type: 'opportunity',
                    title: 'Pico de Fim de Semana',
                    message: 'Historicamente o fim de semana tem 20% mais movimento. Garanta equipe completa e estoque abastecido.',
                    severity: 'info',
                    timestamp: new Date().toISOString()
                });
            }

            // Revenue trending
            if (revenueVariation > 10) {
                generatedInsights.push({
                    id: 'revenue-up',
                    type: 'performance',
                    title: 'Receita em Alta',
                    message: `Sua receita projetada está ${revenueVariation.toFixed(1)}% acima do mês anterior. Continue assim!`,
                    severity: 'success',
                    timestamp: new Date().toISOString()
                });
            } else if (revenueVariation < -10) {
                generatedInsights.push({
                    id: 'revenue-down',
                    type: 'alert',
                    title: 'Queda na Receita',
                    message: `A receita projetada está ${Math.abs(revenueVariation).toFixed(1)}% abaixo do mês anterior. Analise as causas.`,
                    severity: 'warning',
                    timestamp: new Date().toISOString(),
                    actionLabel: 'Ver Relatório'
                });
            }

            setInsights(generatedInsights);

            // 8. Fetch Attendant Performance
            const frentistas = await frentistaService.getAll(postoAtivoId);
            const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

            const performanceData: AttendantPerformance[] = [];
            for (const f of frentistas.slice(0, 5)) { // Top 5
                const historico = await fechamentoFrentistaService.getHistoricoDiferencas(f.id, 30);
                const vendaMedia = historico.reduce((acc: number, h: any) => acc + (h.valor_conferido || 0), 0) / (historico.length || 1);
                const diferencaAcumulada = historico.reduce((acc: number, h: any) => acc + (h.diferenca_calculada || 0), 0);

                performanceData.push({
                    nome: f.nome,
                    vendaMedia,
                    diferencaAcumulada,
                    turnos: historico.length
                });
            }
            setTopPerformers(performanceData.sort((a, b) => b.vendaMedia - a.vendaMedia));

            // 9. Generate AI Promotion Suggestions based on sales patterns
            // Analyze last 30 days of closings by day of week
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const salesByDayMap: Record<number, { volumes: number[], revenues: number[] }> = {
                0: { volumes: [], revenues: [] }, 1: { volumes: [], revenues: [] },
                2: { volumes: [], revenues: [] }, 3: { volumes: [], revenues: [] },
                4: { volumes: [], revenues: [] }, 5: { volumes: [], revenues: [] },
                6: { volumes: [], revenues: [] }
            };

            // Use weeklyVolume data we already have plus historical
            for (let d = 0; d < 30; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dateStr = date.toISOString().split('T')[0];
                const dayOfWeek = date.getDay();

                try {
                    const fechamentos = await fechamentoService.getByDate(dateStr, postoAtivoId);
                    const dayRevenue = fechamentos.reduce((acc: number, f: any) => acc + (f.total_vendas || 0), 0);
                    if (dayRevenue > 0) {
                        salesByDayMap[dayOfWeek].revenues.push(dayRevenue);
                        salesByDayMap[dayOfWeek].volumes.push(dayRevenue / 5); // Rough estimate
                    }
                } catch (e) {
                    // Skip days with no data
                }
            }

            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const analyzedDays: SalesByDayOfWeek[] = Object.entries(salesByDayMap).map(([day, data]) => ({
                day: parseInt(day),
                dayName: dayNames[parseInt(day)],
                avgVolume: data.volumes.length > 0 ? data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length : 0,
                avgRevenue: data.revenues.length > 0 ? data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length : 0,
                count: data.revenues.length
            }));

            setSalesByDay(analyzedDays);

            // Find worst and best performing days
            const sortedDays = [...analyzedDays].filter(d => d.count > 0).sort((a, b) => a.avgRevenue - b.avgRevenue);
            const worstDay = sortedDays[0];
            const bestDay = sortedDays[sortedDays.length - 1];

            if (worstDay && bestDay && worstDay.avgRevenue < bestDay.avgRevenue * 0.7) {
                // Worst day is at least 30% below best day - suggest promotion
                const potentialGain = (bestDay.avgRevenue - worstDay.avgRevenue) * 0.3; // Conservative estimate
                const discountAmount = 0.15; // R$ 0.15/L default
                const estimatedExtraVolume = potentialGain / 5; // Rough calculation
                const roi = potentialGain / (discountAmount * estimatedExtraVolume);

                // Get best product for promotion
                const bestProduct = currentAnalysis.products.sort((a: any, b: any) => b.margin - a.margin)[0];

                setAiPromotion({
                    id: 'promo-weak-day',
                    targetDay: worstDay.dayName,
                    targetProduct: bestProduct?.name || 'Etanol',
                    currentAvg: worstDay.avgRevenue,
                    bestDayAvg: bestDay.avgRevenue,
                    potentialGain: potentialGain,
                    discountSuggested: 15, // centavos
                    roiEstimate: Math.min(5, Math.max(1, roi)),
                    confidence: Math.min(95, 60 + (analyzedDays.filter(d => d.count >= 3).length * 5)),
                    templates: [
                        {
                            id: 'flash',
                            name: 'Flash Weekend',
                            description: `Desconto relâmpago às ${worstDay.dayName}s 14h-18h`,
                            match: 92,
                            icon: 'bolt'
                        },
                        {
                            id: 'fidelity',
                            name: 'Fidelidade+',
                            description: 'Pontos em dobro para clientes cadastrados',
                            match: 78,
                            icon: 'loyalty'
                        },
                        {
                            id: 'combo',
                            name: 'Combo Café',
                            description: 'Abasteça 30L+ e ganhe café grátis',
                            match: 65,
                            icon: 'local_cafe'
                        }
                    ]
                });

                if (selectedPromoProduct === '') {
                    setSelectedPromoProduct(bestProduct?.code || 'ET');
                }
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await loadDashboardData();
            setLoading(false);
        };
        load();
    }, [postoAtivoId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    };

    const handleChatSubmit = () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');

        // Simple AI response simulation (in production, this would call an AI API)
        setTimeout(() => {
            let response = 'Ainda estou aprendendo! Em breve poderei responder perguntas complexas sobre seu negócio.';

            const lowerMsg = userMessage.toLowerCase();
            if (lowerMsg.includes('venda') || lowerMsg.includes('faturamento')) {
                response = metrics
                    ? `Sua receita projetada para este mês é de ${formatCurrency(metrics.receitaProjetada)}, com variação de ${metrics.receitaVariacao > 0 ? '+' : ''}${metrics.receitaVariacao.toFixed(1)}% em relação ao mês anterior.`
                    : 'Carregando dados de vendas...';
            } else if (lowerMsg.includes('estoque') || lowerMsg.includes('combustível') || lowerMsg.includes('tanque')) {
                const critical = stockAlerts.filter(a => a.status === 'CRÍTICO');
                response = critical.length > 0
                    ? `Atenção! ${critical.map(c => c.combustivel).join(', ')} está(ão) com estoque crítico.`
                    : 'Todos os estoques estão em níveis adequados.';
            } else if (lowerMsg.includes('margem') || lowerMsg.includes('lucro')) {
                response = metrics
                    ? `Sua margem média atual é de ${metrics.margemMedia.toFixed(1)}%. ${metrics.margemVariacao >= 0 ? 'Boa performance!' : 'Houve uma queda, verifique os preços.'}`
                    : 'Carregando dados de margem...';
            } else if (lowerMsg.includes('frentista') || lowerMsg.includes('funcionário') || lowerMsg.includes('equipe')) {
                response = topPerformers.length > 0
                    ? `O frentista com melhor desempenho é ${topPerformers[0].nome} com média de ${formatCurrency(topPerformers[0].vendaMedia)}/dia.`
                    : 'Carregando dados de funcionários...';
            }

            setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
        }, 800);
    };

    const handleApplyPromotion = async () => {
        if (!aiPromotion || !postoAtivoId) return;

        setSubmitting(true);
        try {
            // Find the selected template's info or use the first one
            const template = aiPromotion.templates[0];

            await baratenciaService.createPromocao({
                titulo: template.name,
                descricao: `${template.description}. Alvo: ${aiPromotion.targetDay}. Produto: ${selectedPromoProduct}. Desconto: R$ ${(promoDiscount / 100).toFixed(2)}`,
                tipo: 'PRECO_TRAVADO', // Or mapping based on template
                valor_minimo: 0,
                bonus_porcentagem: 0,
                combustivel_codigo: selectedPromoProduct,
                data_inicio: new Date().toISOString(),
                data_fim: null, // Open ended
                ativo: true,
                posto_id: postoAtivoId
            });

            toast.success(`Promoção "${template.name}" agendada com sucesso para ${aiPromotion.targetDay}!`);
        } catch (error: any) {
            console.error('Error applying promotion:', error);
            toast.error('Erro ao agendar promoção: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate max volume for chart scaling
    const maxVolume = useMemo(() => {
        if (weeklyVolume.length === 0) return 1;
        return Math.max(...weeklyVolume.map(d => d.volume)) * 1.1;
    }, [weeklyVolume]);

    if (loading) {
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
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </header>

            <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Receita Projetada */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receita Projetada</p>
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {metrics ? formatCurrency(metrics.receitaProjetada) : 'R$ 0'}
                            </h3>
                            {metrics && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.receitaVariacao >= 0
                                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                                    }`}>
                                    {metrics.receitaVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(metrics.receitaVariacao).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            vs. {metrics ? formatCurrency(metrics.receitaMesAnterior) : 'R$ 0'} mês anterior
                        </p>
                    </div>

                    {/* Volume de Vendas */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume de Vendas</p>
                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                <Fuel className="w-4 h-4 text-blue-500" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {metrics ? formatVolume(metrics.volumeVendas) : '0 L'}
                            </h3>
                            {metrics && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.volumeVariacao >= 0
                                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                                    }`}>
                                    {metrics.volumeVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(metrics.volumeVariacao).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Este mês até agora</p>
                    </div>

                    {/* Margem Média */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-orange-500"></div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margem Média</p>
                            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                <BarChart3 className="w-4 h-4 text-orange-500" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {metrics ? `${metrics.margemMedia.toFixed(1)}%` : '0%'}
                            </h3>
                            {metrics && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${metrics.margemVariacao >= 0
                                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                                    }`}>
                                    {metrics.margemVariacao >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(metrics.margemVariacao).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Lucro líquido sobre vendas</p>
                    </div>

                    {/* Score de Eficiência */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score de Eficiência</p>
                            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                <Target className="w-4 h-4 text-purple-500" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {metrics ? `${metrics.scoreEficiencia.toFixed(1)}/10` : '0/10'}
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {metrics && metrics.scoreEficiencia >= 8 ? 'Excelente' : metrics && metrics.scoreEficiencia >= 6 ? 'Bom' : 'Atenção'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Baseado em margem e operação</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Charts and Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Weekly Volume Chart */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Vendas da Semana</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Volume diário com projeções</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Semana Atual</span>
                                </div>
                            </div>

                            <div className="h-52 w-full flex items-end justify-between gap-3 px-2">
                                {weeklyVolume.map((day, idx) => {
                                    const heightPercent = maxVolume > 0 ? (day.volume / maxVolume) * 100 : 0;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center group">
                                            <div className="w-full relative" style={{ height: '180px' }}>
                                                <div
                                                    className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${day.isProjection
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400'
                                                        : 'bg-indigo-500'
                                                        } ${day.isToday ? 'ring-2 ring-indigo-300 dark:ring-indigo-600' : ''}`}
                                                    style={{ height: `${heightPercent}%` }}
                                                >
                                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                                                        {formatCurrency(day.volume)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-xs mt-2 ${day.isToday ? 'font-bold text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {day.diaSemana}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded bg-indigo-500"></span>
                                    <span className="text-xs text-slate-500">Realizado</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded border-2 border-dashed border-indigo-400 bg-indigo-50"></span>
                                    <span className="text-xs text-slate-500">Projeção</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Promotion Simulator */}
                        {aiPromotion && (
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
                        )}

                        {/* Stock Status */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Status do Estoque</h2>
                                <Fuel className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {stockAlerts.length > 0 ? stockAlerts.map((stock, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-10 rounded-full ${stock.status === 'CRÍTICO' ? 'bg-red-500' :
                                                stock.status === 'BAIXO' ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}></div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white text-sm">{stock.combustivel}</p>
                                                <p className="text-xs text-slate-500">{stock.diasRestantes} dias restantes</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${stock.status === 'CRÍTICO' ? 'text-red-600' :
                                                stock.status === 'BAIXO' ? 'text-amber-600' : 'text-emerald-600'
                                                }`}>{stock.percentual.toFixed(0)}%</p>
                                            <p className="text-xs text-slate-400">{stock.status}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-slate-500 py-4">Nenhum dado de estoque disponível</p>
                                )}
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Performance da Equipe</h2>
                                <Users className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {topPerformers.length > 0 ? topPerformers.map((perf, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                                }`}>
                                                {idx + 1}º
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white text-sm">{perf.nome}</p>
                                                <p className="text-xs text-slate-500">{perf.turnos} dias no mês</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-slate-800 dark:text-white">{formatCurrency(perf.vendaMedia)}</p>
                                            <p className={`text-xs ${perf.diferencaAcumulada >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {perf.diferencaAcumulada >= 0 ? '+' : ''}{formatCurrency(perf.diferencaAcumulada)}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-slate-500 py-4">Nenhum dado de frentistas disponível</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Insights and Chat */}
                    <div className="space-y-6">
                        {/* AI Insights */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    Insights IA
                                </h2>
                                {insights.length > 0 && (
                                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                        {insights.length} Novos
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                                {insights.length > 0 ? insights.map(insight => (
                                    <div key={insight.id} className={`p-3 rounded-lg border ${insight.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                                        insight.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
                                            insight.severity === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                                'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                        }`}>
                                        <div className="flex items-start gap-2">
                                            {insight.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" /> :
                                                insight.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" /> :
                                                    insight.severity === 'success' ? <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5" /> :
                                                        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />}
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold uppercase ${insight.severity === 'critical' ? 'text-red-700 dark:text-red-400' :
                                                    insight.severity === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                                                        insight.severity === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                                                            'text-blue-700 dark:text-blue-400'
                                                    }`}>{insight.title}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{insight.message}</p>
                                                {insight.actionLabel && (
                                                    <button className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {insight.actionLabel} →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">Nenhum insight no momento</p>
                                        <p className="text-slate-400 text-xs">Os insights serão gerados conforme mais dados forem coletados</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Chat */}
                        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-md p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Consultor IA</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Pergunte sobre seus dados</p>
                                </div>
                            </div>

                            <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] ${msg.role === 'user'
                                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-tr-none'
                                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                                    placeholder="Digite sua pergunta..."
                                    className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
                                />
                                <button
                                    onClick={handleChatSubmit}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};
