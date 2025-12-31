import React, { useState, useEffect } from 'react';
import {
    Building2,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    AlertTriangle,
    Loader2,
    RefreshCw,
    BarChart3,
    ArrowUpRight,
    PiggyBank,
    Receipt,
    CreditCard
} from 'lucide-react';
import { postoService, frentistaService, fechamentoService } from '../services/api';
import type { Posto } from '../services/database.types';
import { supabase } from '../services/supabase';

// ============================================
// TYPES
// ============================================

interface PostoSummary {
    posto: Posto;
    vendasHoje: number;
    vendasMes: number;
    lucroEstimadoHoje: number;
    lucroEstimadoMes: number;
    margemMedia: number;
    frentistasAtivos: number;
    dividasTotal: number;
    despesasPendentes: number;
    ultimoFechamento: string | null;
}

interface ConsolidatedData {
    totalVendasHoje: number;
    totalVendasMes: number;
    totalLucroHoje: number;
    totalLucroMes: number;
    totalDividas: number;
    totalDespesasPendentes: number;
    totalFrentistas: number;
    postosSummary: PostoSummary[];
}

interface Alert {
    type: 'warning' | 'danger' | 'info' | 'success';
    posto: string;
    message: string;
    icon: React.ElementType;
}

// ============================================
// COMPONENT
// ============================================

const OwnerDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<ConsolidatedData | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Buscar todos os postos ativos
            const postos = await postoService.getAll();

            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().toISOString().slice(0, 7);
            const startOfMonth = `${currentMonth}-01`;

            // Processar cada posto
            const summaries: PostoSummary[] = await Promise.all(
                postos.map(async (posto) => {
                    try {
                        // Frentistas
                        const frentistas = await frentistaService.getAll(posto.id);
                        const frentistasAtivos = frentistas.filter(f => f.ativo).length;

                        // Fechamentos de hoje
                        const fechamentosHoje = await fechamentoService.getByDate(today, posto.id);
                        const vendasHoje = fechamentosHoje.reduce((acc: number, f: any) => acc + (f.total_vendas || 0), 0);

                        // Fechamentos do mês (simplificado - busca últimos 30 dias)
                        const { data: fechamentosMes } = await supabase
                            .from('Fechamento')
                            .select('total_vendas, data')
                            .eq('posto_id', posto.id)
                            .gte('data', startOfMonth)
                            .lte('data', today);

                        const vendasMes = (fechamentosMes || []).reduce((acc, f) => acc + (f.total_vendas || 0), 0);

                        // Dívidas pendentes
                        const { data: dividas } = await supabase
                            .from('Divida')
                            .select('valor')
                            .eq('posto_id', posto.id)
                            .eq('status', 'pendente');

                        const dividasTotal = (dividas || []).reduce((acc, d) => acc + (d.valor || 0), 0);

                        // Empréstimos ativos
                        const { data: emprestimos } = await supabase
                            .from('Emprestimo')
                            .select('valor_total')
                            .eq('posto_id', posto.id)
                            .eq('ativo', true);

                        const emprestimosTotal = (emprestimos || []).reduce((acc, e) => acc + (e.valor_total || 0), 0);

                        // Despesas pendentes
                        const { data: despesas } = await supabase
                            .from('Despesa')
                            .select('valor')
                            .eq('posto_id', posto.id)
                            .eq('status', 'pendente');

                        const despesasPendentes = (despesas || []).reduce((acc, d) => acc + (d.valor || 0), 0);

                        // Buscar margem média dos combustíveis
                        const { data: combustiveis } = await supabase
                            .from('Combustivel')
                            .select('preco_venda, preco_custo')
                            .eq('posto_id', posto.id)
                            .eq('ativo', true);

                        let margemMedia = 0;
                        if (combustiveis && combustiveis.length > 0) {
                            const margensValidas = combustiveis
                                .filter(c => c.preco_custo && c.preco_venda && c.preco_venda > 0 && c.preco_custo > 0)
                                .map(c => ((c.preco_venda - c.preco_custo) / c.preco_venda) * 100);

                            if (margensValidas.length > 0) {
                                margemMedia = margensValidas.reduce((a, b) => a + b, 0) / margensValidas.length;
                            }
                        }

                        // Último fechamento
                        const { data: ultimoFech } = await supabase
                            .from('Fechamento')
                            .select('data')
                            .eq('posto_id', posto.id)
                            .order('data', { ascending: false })
                            .limit(1);

                        return {
                            posto,
                            vendasHoje,
                            vendasMes,
                            lucroEstimadoHoje: vendasHoje * (margemMedia / 100),
                            lucroEstimadoMes: vendasMes * (margemMedia / 100),
                            margemMedia,
                            frentistasAtivos,
                            dividasTotal: dividasTotal + emprestimosTotal,
                            despesasPendentes,
                            ultimoFechamento: ultimoFech?.[0]?.data || null
                        };
                    } catch (error) {
                        console.error(`Erro ao carregar dados do posto ${posto.nome}:`, error);
                        return {
                            posto,
                            vendasHoje: 0,
                            vendasMes: 0,
                            lucroEstimadoHoje: 0,
                            lucroEstimadoMes: 0,
                            margemMedia: 0,
                            frentistasAtivos: 0,
                            dividasTotal: 0,
                            despesasPendentes: 0,
                            ultimoFechamento: null
                        };
                    }
                })
            );

            // Calcular totais consolidados
            const consolidated: ConsolidatedData = {
                totalVendasHoje: summaries.reduce((acc, s) => acc + s.vendasHoje, 0),
                totalVendasMes: summaries.reduce((acc, s) => acc + s.vendasMes, 0),
                totalLucroHoje: summaries.reduce((acc, s) => acc + s.lucroEstimadoHoje, 0),
                totalLucroMes: summaries.reduce((acc, s) => acc + s.lucroEstimadoMes, 0),
                totalDividas: summaries.reduce((acc, s) => acc + s.dividasTotal, 0),
                totalDespesasPendentes: summaries.reduce((acc, s) => acc + s.despesasPendentes, 0),
                totalFrentistas: summaries.reduce((acc, s) => acc + s.frentistasAtivos, 0),
                postosSummary: summaries.sort((a, b) => b.vendasMes - a.vendasMes)
            };

            setData(consolidated);

            // Gerar alertas
            const newAlerts: Alert[] = [];

            summaries.forEach(s => {
                // Alertas de dívidas
                if (s.dividasTotal > 0) {
                    newAlerts.push({
                        type: 'warning',
                        posto: s.posto.nome,
                        message: `Possui R$ ${s.dividasTotal.toLocaleString('pt-BR')} em dívidas/empréstimos`,
                        icon: CreditCard
                    });
                }

                // Alertas de margem baixa
                if (s.margemMedia < 10) {
                    newAlerts.push({
                        type: 'danger',
                        posto: s.posto.nome,
                        message: `Margem média baixa: ${s.margemMedia.toFixed(1)}%`,
                        icon: TrendingDown
                    });
                }

                // Posto sem vendas hoje
                if (s.vendasHoje === 0 && new Date().getHours() > 12) {
                    newAlerts.push({
                        type: 'info',
                        posto: s.posto.nome,
                        message: 'Sem vendas registradas hoje',
                        icon: AlertTriangle
                    });
                }

                // Melhor performance
                if (s === summaries.sort((a, b) => b.lucroEstimadoMes - a.lucroEstimadoMes)[0] && s.lucroEstimadoMes > 0) {
                    newAlerts.push({
                        type: 'success',
                        posto: s.posto.nome,
                        message: 'Melhor performance do mês! 🏆',
                        icon: TrendingUp
                    });
                }
            });

            setAlerts(newAlerts);
        } catch (error) {
            console.error('Erro ao carregar dados consolidados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const getAlertColor = (type: Alert['type']) => {
        switch (type) {
            case 'danger': return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
            case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400';
            case 'success': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
            default: return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Carregando dados de todos os postos...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-gray-500">Erro ao carregar dados</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                            <Building2 className="w-6 h-6" />
                        </div>
                        Visão do Proprietário
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Consolidado de {data.postosSummary.length} postos • Atualizado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        {(['hoje', 'semana', 'mes'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedPeriod === period
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {period === 'hoje' ? 'Hoje' : period === 'semana' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Cards Consolidados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Vendas Hoje */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-blue-100 text-sm font-medium">Vendas Hoje</span>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(data.totalVendasHoje)}</p>
                    <p className="text-blue-200 text-sm mt-1">
                        {data.postosSummary.length} postos ativos
                    </p>
                </div>

                {/* Lucro Estimado */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-green-100 text-sm font-medium">Lucro Est. Hoje</span>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(data.totalLucroHoje)}</p>
                    <p className="text-green-200 text-sm mt-1">
                        Margem média da rede
                    </p>
                </div>

                {/* Dívidas Totais */}
                <div className={`rounded-2xl p-5 ${data.totalDividas > 0
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white'
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium ${data.totalDividas > 0 ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            Dívidas Totais
                        </span>
                        <div className={`p-2 rounded-lg ${data.totalDividas > 0 ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(data.totalDividas)}</p>
                    <p className={`text-sm mt-1 ${data.totalDividas > 0 ? 'text-red-200' : 'text-gray-400'}`}>
                        {data.totalDividas > 0 ? 'Em aberto' : 'Sem pendências ✓'}
                    </p>
                </div>

                {/* Frentistas */}
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-purple-100 text-sm font-medium">Equipe Total</span>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{data.totalFrentistas}</p>
                    <p className="text-purple-200 text-sm mt-1">
                        Frentistas ativos
                    </p>
                </div>
            </div>

            {/* Vendas do Mês */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resultado do Mês</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Acumulado até hoje</p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="font-medium text-sm">Lucro: {formatCurrency(data.totalLucroMes)}</span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Vendas Totais</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalVendasMes)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                                    <PiggyBank className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Despesas Pendentes</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalDespesasPendentes)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Lucro Líquido Estimado</p>
                            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(data.totalLucroMes - data.totalDespesasPendentes)}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                (Lucro Bruto - Despesas)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking de Postos */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Performance por Posto
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Posto
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Vendas Hoje
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Vendas Mês
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Margem
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Lucro Est. Mês
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Dívidas
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Equipe
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.postosSummary.map((summary, index) => (
                                <tr
                                    key={summary.posto.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-amber-500' :
                                                index === 1 ? 'bg-gray-400' :
                                                    index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {summary.posto.nome}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {summary.posto.cidade && `${summary.posto.cidade}${summary.posto.estado ? `, ${summary.posto.estado}` : ''}`}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(summary.vendasHoje)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(summary.vendasMes)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${summary.margemMedia >= 12 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            summary.margemMedia >= 8 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {summary.margemMedia.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(summary.lucroEstimadoMes)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {summary.dividasTotal > 0 ? (
                                            <span className="font-medium text-red-600 dark:text-red-400">
                                                {formatCurrency(summary.dividasTotal)}
                                            </span>
                                        ) : (
                                            <span className="text-green-600 dark:text-green-400 text-sm">
                                                Livre ✓
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <Users className="w-4 h-4" />
                                            {summary.frentistasAtivos}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alertas */}
            {alerts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Alertas & Insights
                    </h2>
                    <div className="space-y-3">
                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 p-4 rounded-xl border ${getAlertColor(alert.type)}`}
                            >
                                <alert.icon className="w-5 h-5 flex-shrink-0" />
                                <div className="flex-1">
                                    <span className="font-medium">{alert.posto}:</span>{' '}
                                    <span>{alert.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Info */}
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                <p>💡 Os valores de lucro são estimativas baseadas na margem média de cada posto</p>
            </div>
        </div>
    );
};

export default OwnerDashboard;
