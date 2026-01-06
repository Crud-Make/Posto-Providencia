import React, { useState, useEffect } from 'react';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    RefreshCw,
    Plus,
    MoreVertical,
    Wallet,
    DollarSign,
    Target,
    LineChart as ChartIcon,
    Edit,
    Trash2,
    X,
    Check,
    Building2
} from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    ReferenceLine
} from 'recharts';
import { solvencyService, dividaService } from '../services/api';
import { SolvencyProjection, SolvencyStatus, Divida } from '../types';
import { usePosto } from '../contexts/PostoContext';

const TelaDashboardSolvencia: React.FC = () => {
    const { postoAtivoId } = usePosto();

    const [projection, setProjection] = useState<SolvencyProjection | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDivida, setEditingDivida] = useState<Divida | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formState, setFormState] = useState<Omit<Divida, 'id'>>({
        descricao: '',
        valor: 0,
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'pendente',
        posto_id: postoAtivoId || 1
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await solvencyService.getProjection(postoAtivoId);
            setProjection(data);
        } catch (error) {
            console.error("Failed to load solvency data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (divida?: Divida) => {
        if (divida) {
            setEditingDivida(divida);
            setFormState({
                descricao: divida.descricao,
                valor: divida.valor,
                data_vencimento: divida.data_vencimento,
                status: divida.status,
                posto_id: divida.posto_id
            });
        } else {
            setEditingDivida(null);
            setFormState({
                descricao: '',
                valor: 0,
                data_vencimento: new Date().toISOString().split('T')[0],
                status: 'pendente',
                posto_id: postoAtivoId || 1
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingDivida) {
                await dividaService.update(editingDivida.id, formState);
                toast.success("Dívida atualizada!");
            } else {
                await dividaService.create(formState);
                toast.success("Dívida cadastrada!");
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error("Failed to save debt", error);
            toast.error("Erro ao salvar dívida.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta dívida?")) return;

        try {
            await dividaService.delete(id);
            toast.success("Dívida excluída!");
            loadData();
        } catch (error) {
            console.error("Failed to delete debt", error);
            toast.error("Erro ao excluir dívida.");
        }
    };

    const handleResolveDeficit = async (dividaId: string) => {
        toast.info("Analisando opções para resolver déficit...", {
            description: "Sugestões: Renegociação de prazo, aporte de capital ou antecipação de recebíveis de cartão (Pix já está incluso)."
        });

        // Let's offer a quick action: mark as paid if they manually paid it
        if (confirm("Deseja marcar esta dívida como PAGA para remover o alerta de déficit?")) {
            try {
                await dividaService.update(dividaId, { status: 'pago' });
                toast.success("Dívida marcada como paga. Recalculando projeção...");
                loadData();
            } catch (error) {
                toast.error("Erro ao atualizar status da dívida.");
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [postoAtivoId]);

    const getStatusColor = (status: 'verde' | 'amarelo' | 'vermelho') => {
        switch (status) {
            case 'verde': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
            case 'amarelo': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
            case 'vermelho': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
        }
    };

    const getStatusBadge = (status: 'verde' | 'amarelo' | 'vermelho') => {
        switch (status) {
            case 'verde': return 'Seguro';
            case 'amarelo': return 'Atenção';
            case 'vermelho': return 'Crítico';
        }
    };

    const chartData = (() => {
        if (!projection) return [];
        const data = [];
        let runningBalance = projection.saldoAtual;
        const today = new Date();

        for (let i = 0; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Add daily sales average
            runningBalance += projection.mediaDiaria;

            // Subtract debts due today
            const debtsToday = projection.proximasParcelas.filter(p => p.dataVencimento === dateStr);
            const totalDebtsToday = debtsToday.reduce((sum, d) => sum + d.valor, 0);
            runningBalance -= totalDebtsToday;

            data.push({
                name: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                saldo: runningBalance,
                isDebt: totalDebtsToday > 0,
                debtName: debtsToday.map(d => d.descricao).join(', ')
            });
        }
        return data;
    })();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">
                        R$ {data.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {data.isDebt && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-red-500 uppercase">Pagamento:</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{data.debtName}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (loading && !projection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] w-full">
                <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-medium">Calculando projeções de solvência...</p>
            </div>
        );
    }

    const totalAPagar = projection?.proximasParcelas.reduce((acc, p) => acc + p.valor, 0) || 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Painel de Solvência</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Visão estratégica de caixa e previsão de pagamentos futuros.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Última atualização: Hoje, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        Nova Dívida
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Wallet size={24} />
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Saldo Atual</p>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">R$ {(projection?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-green-600 font-bold">
                        <TrendingUp size={16} />
                        <span>Disponível em Cartão/Pix</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Target size={24} />
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Média Diária Vendas</p>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">R$ {(projection?.mediaDiaria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: '75%' }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">A Pagar (30 dias)</p>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">R$ {totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                        <Calendar size={16} />
                        <span>{projection?.proximasParcelas.length || 0} pagamentos pendentes</span>
                    </div>
                </div>

                {/* Card de Meta de Vendas */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Meta de Vendas</p>
                    </div>

                    {projection?.metaVendas ? (
                        <>
                            <div className="mb-3">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    {(projection.metaVendas.litrosNecessarios - projection.metaVendas.litrosVendidosMes).toLocaleString('pt-BR')} L
                                </h3>
                                <p className="text-xs text-green-600 dark:text-green-400 font-bold">para quitar compromissos</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-500 dark:text-gray-400">Progresso do mês</span>
                                    <span className="text-green-600 dark:text-green-400 font-bold">{Math.round(projection.metaVendas.progressoPorcentagem)}%</span>
                                </div>
                                <div className="w-full bg-green-100 dark:bg-green-800/30 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${projection.metaVendas.progressoPorcentagem}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{projection.metaVendas.litrosVendidosMes.toLocaleString('pt-BR')} L vendidos</span>
                                    <span>Meta: {projection.metaVendas.litrosNecessarios.toLocaleString('pt-BR')} L</span>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Lucro gerado</span>
                                    <span className="text-sm font-black text-green-600">
                                        R$ {projection.metaVendas.lucroGeradoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Falta quitar</span>
                                    <span className="text-sm font-black text-orange-600">
                                        R$ {projection.metaVendas.valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <Loader2 size={24} className="animate-spin mx-auto text-green-500 mb-2" />
                            <p className="text-xs text-gray-500">Calculando meta...</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Timeline de Drenagem */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm mb-10 overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <ChartIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Timeline de Drenagem</h2>
                        <p className="text-xs text-gray-500">Projeção de impacto das dívidas no fluxo de caixa (30 dias)</p>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#137fec" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#999' }}
                                minTickGap={20}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#999' }}
                                tickFormatter={(value) => `R$ ${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="#ff0000" strokeDasharray="3 3" label={{ position: 'right', value: 'Limite', fill: '#ff0000', fontSize: 10 }} />
                            <Area
                                type="monotone"
                                dataKey="saldo"
                                stroke="#137fec"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorSaldo)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#137fec' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Traffic Light Section */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <Activity size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Semáforo de Caixa</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {projection?.proximasParcelas.map((p, idx) => (
                        <div
                            key={idx}
                            className={`relative overflow-hidden group bg-white dark:bg-gray-800 rounded-2xl border-l-4 p-6 shadow-sm hover:shadow-md transition-all ${p.status === 'verde' ? 'border-green-500 shadow-green-500/5' :
                                p.status === 'amarelo' ? 'border-yellow-500 shadow-yellow-500/5' :
                                    'border-red-500 shadow-red-500/5'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(p.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'verde' ? 'bg-green-500 animate-pulse' : p.status === 'amarelo' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></span>
                                        {getStatusBadge(p.status)}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3 truncate">{p.descricao}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Vencimento</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(p.dataVencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">R$ {p.valor.toLocaleString('pt-BR')}</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 dark:text-gray-500">
                                        <span>Cobertura Projetada</span>
                                        <span>{Math.round(p.coberturaPorcentagem)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${p.status === 'verde' ? 'bg-green-500' :
                                                p.status === 'amarelo' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`}
                                            style={{ width: `${p.coberturaPorcentagem}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border flex gap-3 ${getStatusColor(p.status)}`}>
                                {p.status === 'verde' ? <CheckCircle2 size={20} className="shrink-0" /> :
                                    p.status === 'amarelo' ? <RefreshCw size={20} className="shrink-0" /> :
                                        <AlertCircle size={20} className="shrink-0" />}
                                <p className="text-xs font-medium leading-relaxed">{p.mensagem}</p>
                            </div>

                            {p.status === 'vermelho' && (
                                <button
                                    onClick={() => handleResolveDeficit(p.dividaId!)}
                                    className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Resolver Déficit
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Payments List */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Todos os Pagamentos</h2>
                    <button className="text-blue-600 text-sm font-bold hover:underline">Ver completo</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Vencimento</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Previsão</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {projection?.proximasParcelas.map((p, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-xs text-gray-500">
                                                {p.descricao.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white">{p.descricao}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-black text-gray-900 dark:text-white">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${p.status === 'verde' ? 'bg-green-100 text-green-700' :
                                            p.status === 'amarelo' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {p.status === 'verde' ? 'Coberto' : p.status === 'amarelo' ? 'No Caminho' : 'Déficit'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    const fullDivida = {
                                                        id: p.dividaId,
                                                        descricao: p.descricao,
                                                        valor: p.valor,
                                                        data_vencimento: p.dataVencimento,
                                                        status: 'pendente' as 'pendente' | 'pago',
                                                        posto_id: postoAtivoId || 1
                                                    };
                                                    handleOpenModal(fullDivida);
                                                }}
                                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.dividaId)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                    {editingDivida ? 'Editar Dívida' : 'Nova Dívida'}
                                </h2>
                                <p className="text-sm text-gray-500">Preencha os dados do pagamento.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={formState.descricao}
                                    onChange={(e) => setFormState({ ...formState, descricao: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    placeholder="Ex: Vibra Energia, Aluguel..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Valor (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formState.valor}
                                        onChange={(e) => setFormState({ ...formState, valor: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Vencimento</label>
                                    <input
                                        type="date"
                                        required
                                        value={formState.data_vencimento}
                                        onChange={(e) => setFormState({ ...formState, data_vencimento: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormState({ ...formState, status: 'pendente' })}
                                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formState.status === 'pendente'
                                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-700 text-gray-500'
                                            }`}
                                    >
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormState({ ...formState, status: 'pago' })}
                                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formState.status === 'pago'
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-700 text-gray-500'
                                            }`}
                                    >
                                        Pago
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-black rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Check size={20} />
                                    )}
                                    {editingDivida ? 'Salvar Alterações' : 'Cadastrar Dívida'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelaDashboardSolvencia;
