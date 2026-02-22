import React, { useState, useEffect, useMemo } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { fechamentoMensalService, FechamentoMensalResumo, EncerranteMensal } from '../../services/api/fechamentoMensal.service';
import { leituraService } from '../../services/api';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Droplets, CreditCard, ChevronDown, ChevronUp, AlertCircle, RefreshCw, FileText, Activity, Target, BarChart2, Droplet, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';

interface FechamentoMensalProps {
    isEmbedded?: boolean;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

// Formatação Decimal com 3 casas para encerrantes
const formatDecimal = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

const formatDate = (dateString: string) => {
    if (!dateString) return '--/--';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}`;
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

const FechamentoMensal: React.FC<FechamentoMensalProps> = ({ isEmbedded = false }) => {
    const { postoAtivo } = usePosto();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [dados, setDados] = useState<FechamentoMensalResumo[]>([]);
    const [encerrantes, setEncerrantes] = useState<EncerranteMensal[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [temDadosPendentes, setTemDadosPendentes] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // Stats calculations
    const totalizers = useMemo(() => {
        return dados.reduce((acc, curr) => ({
            volume: acc.volume + curr.volume_total,
            faturamento: acc.faturamento + curr.faturamento_bruto,
            lucro: acc.lucro + curr.lucro_liquido,
            taxas: acc.taxas + curr.custo_taxas,
            gas: acc.gas + curr.vol_gasolina,
            adt: acc.adt + curr.vol_aditivada,
            eta: acc.eta + curr.vol_etanol,
            die: acc.die + curr.vol_diesel
        }), { volume: 0, faturamento: 0, lucro: 0, taxas: 0, gas: 0, adt: 0, eta: 0, die: 0 });
    }, [dados]);

    // Projections
    const daysInMonth = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        return new Date(y, m, 0).getDate();
    }, [selectedMonth]);

    const daysPassed = dados.length || 1;

    // Simple projection: (Total / DaysPassed) * DaysInMonth
    const projectedProfit = (totalizers.lucro / daysPassed) * daysInMonth;
    const projectedVolume = (totalizers.volume / daysPassed) * daysInMonth;

    // Goals (Hardcoded for now, could be DB driven)
    const metaLucro = 60000;
    const metaVolume = 150000;

    const dataGraficoDiario = useMemo(() => {
        return dados.map(d => ({
            dia: formatDate(d.dia),
            lucro: d.lucro_liquido,
            vendas: d.faturamento_bruto,
            volume: d.volume_total
        }));
    }, [dados]);

    const dataMixCombustivel = useMemo(() => [
        { name: 'Gasolina', value: totalizers.gas },
        { name: 'Aditivada', value: totalizers.adt },
        { name: 'Etanol', value: totalizers.eta },
        { name: 'Diesel', value: totalizers.die },
    ].filter(item => item.value > 0), [totalizers]);


    const carregarDados = async () => {
        if (typeof window === 'undefined') return; // Changed process.browser to typeof window === 'undefined' for broader compatibility

        try {
            setLoading(true);
            setError(null);
            setTemDadosPendentes(false);

            if (!postoAtivo?.id) return;

            const [ano, mes] = selectedMonth.split('-').map(Number);

            const [resumo, encerrantes] = await Promise.all([
                fechamentoMensalService.getResumoMensal(postoAtivo.id, mes, ano),
                fechamentoMensalService.getEncerrantesMensal(postoAtivo.id, mes, ano)
            ]);

            setDados(resumo);
            setEncerrantes(encerrantes);

            // Verifica pendências se não houver dados fechados
            if (resumo.length === 0 && encerrantes.length === 0) {
                const startDate = `${selectedMonth}-01`;
                const lastDay = new Date(ano, mes, 0).getDate();
                const endDate = `${selectedMonth}-${lastDay}`;

                try {
                    const leiturasRes = await leituraService.getByDateRange(startDate, endDate, postoAtivo.id);
                    if (leiturasRes.success && leiturasRes.data && leiturasRes.data.length > 0) {
                        setTemDadosPendentes(true);
                    }
                } catch (err) {
                    console.error('Erro checando pendencias:', err);
                }
            }

        } catch (err) {
            console.error('Erro ao carregar dados mensais:', err);
            setError('Não foi possível carregar o resumo mensal. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [postoAtivo, selectedMonth]);

    return (
        <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans ${isEmbedded ? 'bg-transparent min-h-0' : 'p-6 md:p-8'}`}>

            {/* Header Improved */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 animate-in slide-in-from-top-4 duration-700">
                {!isEmbedded ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-all hover:scale-105 border border-slate-700/50 group"
                        >
                            <ArrowLeft size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 tracking-tight">
                                Fechamento Mensal
                            </h1>
                            <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Dashboard Consolidado
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/10">
                            <BarChart2 size={22} className="text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Painel Gerencial</h2>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        onClick={carregarDados}
                        disabled={loading}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700/50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1.5 pr-4 shadow-xl shadow-black/20 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                        <div className="p-2 bg-slate-800 rounded-lg mr-3 text-blue-400 shadow-sm">
                            <Calendar size={18} />
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-200 uppercase tracking-wide cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-32 text-center relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                    {/* <Loader2 size={48} className="animate-spin text-blue-500 mb-6 relative z-10" /> */}
                    <h3 className="text-xl font-bold text-white mb-2 relative z-10">Consolidando Dados Financeiros</h3>
                    <p className="text-slate-400 relative z-10">Calculando margens, volumes e projeções...</p>
                </div>
            ) : dados.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed group hover:border-slate-700 transition-colors">
                    <div className="text-center max-w-md mx-auto">
                        <div className={`w-20 h-20 ${temDadosPendentes ? 'bg-yellow-500/10' : 'bg-slate-800'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                            {temDadosPendentes ? (
                                <FileText className="w-10 h-10 text-yellow-500" />
                            ) : (
                                <AlertCircle className="w-10 h-10 text-slate-600" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {temDadosPendentes
                                ? "Dados encontrados, mas pendentes de fechamento"
                                : "Sem dados fechados para este mês"
                            }
                        </h3>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            {temDadosPendentes
                                ? "Identificamos vendas lançadas neste período, mas os dias ainda não foram fechados. Para visualizar o painel, acesse o Fechamento Diário e clique em **Salvar Fechamento** para os dias pendentes."
                                : "Para visualizar o painel mensal, é necessário realizar e **salvar** os fechamentos diários. O sistema consolida automaticamente os dias encerrados."
                            }
                        </p>
                        <button
                            onClick={() => navigate('/fechamento-caixa')}
                            className={`${temDadosPendentes
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                } transition-all duration-300 px-8 py-3 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl inline-flex items-center gap-2`}
                        >
                            Ir para Fechamento Diário
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* Top Stats Cards with Glow Effects */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Lucro */}
                        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 shadow-lg hover:shadow-emerald-900/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-1">Lucro Líquido</p>
                                    <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalizers.lucro)}</h3>
                                </div>
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/20">
                                    <DollarSign size={24} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-500">Meta: {formatCurrency(metaLucro)}</span>
                                    <span className="text-emerald-400">{((totalizers.lucro / metaLucro) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${Math.min((totalizers.lucro / metaLucro) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 overflow-hidden hover:border-blue-500/30 transition-all duration-500 shadow-lg hover:shadow-blue-900/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest mb-1">Volume Vendido</p>
                                    <h3 className="text-3xl font-black text-white tracking-tight">{formatNumber(totalizers.volume)} <span className="text-base font-medium text-slate-500">L</span></h3>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform border border-blue-500/20">
                                    <Droplet size={24} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-500">Meta: {formatNumber(metaVolume)} L</span>
                                    <span className="text-blue-400">{((totalizers.volume / metaVolume) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                                    <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                        style={{ width: `${Math.min((totalizers.volume / metaVolume) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Faturamento */}
                        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 overflow-hidden hover:border-purple-500/30 transition-all duration-500 shadow-lg hover:shadow-purple-900/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100"></div>

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-purple-500/80 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                                    <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalizers.faturamento)}</h3>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform border border-purple-500/20">
                                    <Activity size={24} />
                                </div>
                            </div>

                            <div className="mt-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400">Ticket Médio</span>
                                <span className="text-sm font-bold text-purple-300">
                                    R$ {totalizers.volume > 0 ? (totalizers.faturamento / totalizers.volume).toFixed(2) : '0,00'} / L
                                </span>
                            </div>
                        </div>

                        {/* Projeção Card Premium */}
                        <div className="relative bg-gradient-to-br from-indigo-900 to-blue-900 border border-indigo-500/30 rounded-2xl p-6 overflow-hidden shadow-xl shadow-indigo-900/20">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 text-indigo-200">
                                    <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-wider">Projeção Mensal</span>
                                </div>

                                <h3 className="text-4xl font-black text-white tracking-tight mb-2">
                                    {formatCurrency(projectedProfit)}
                                </h3>

                                <div className="flex items-center gap-2 text-indigo-200/70 text-xs font-medium mt-4 p-2 bg-indigo-950/30 rounded-lg border border-indigo-500/20 backdrop-blur-sm">
                                    <Target size={14} />
                                    <span>Baseado em {daysPassed} dias de operação</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                        {/* Daily Trend Chart (Area) */}
                        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" />
                                    Evolução Financeira
                                </h3>
                                <div className="flex gap-2 text-xs font-medium text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Faturamento</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Lucro</span>
                                </div>
                            </div>

                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="99%" height="100%">
                                    <AreaChart data={dataGraficoDiario} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="dia" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                borderColor: '#334155',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                                border: '1px solid rgba(148, 163, 184, 0.1)',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                            cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
                                        />
                                        <Area type="monotone" dataKey="vendas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVendas)" name="Faturamento" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        <Area type="monotone" dataKey="lucro" stroke="#10b981" fillOpacity={1} fill="url(#colorLucro)" name="Lucro Líquido" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Mix Chart (Pie) */}
                        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-50"></div>
                            <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
                                <Droplet size={18} className="text-purple-500" />
                                Mix de Produtos
                            </h3>
                            <div className="h-[280px] w-full relative">
                                <ResponsiveContainer width="99%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataMixCombustivel}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {dataMixCombustivel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                borderColor: '#334155',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                                            }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                            formatter={(value: number) => formatNumber(value) + ' L'}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            formatter={(value) => <span className="text-slate-300 text-xs font-medium ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <span className="block text-3xl font-black text-slate-100">{dataMixCombustivel.length}</span>
                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Produtos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção de Encerrantes / Lista */}
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50">
                            <div>
                                <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    Detalhamento dos Encerrantes (Bombas)
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Comparativo auditável entre leitura física e sistema</p>
                            </div>
                            <div className="flex gap-3 text-xs font-medium bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                                <span className="flex items-center text-emerald-400 gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Normal</span>
                                <span className="flex items-center text-red-400 gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Divergente</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-950/30 text-[10px] uppercase text-slate-400 font-extrabold tracking-widest border-b border-slate-800">
                                        <th className="px-6 py-5">Bico / Produto</th>
                                        <th className="px-6 py-5 text-right">Enc. Inicial ({formatDate(`${selectedMonth}-01`)})</th>
                                        <th className="px-6 py-5 text-right">Enc. Atual</th>
                                        <th className="px-6 py-5 text-right">Diferença</th>
                                        <th className="px-6 py-5 text-right">Vendas Lançadas</th>
                                        <th className="px-6 py-5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {encerrantes.map((row, idx) => {
                                        const isOk = Math.abs(row.diferenca) < 1; // 1 litro tolerance
                                        const isPositive = row.diferenca > 0;

                                        return (
                                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${row.combustivel_nome.toLowerCase().includes('gasolina') ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                            row.combustivel_nome.toLowerCase().includes('etanol') ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{row.bico_nome}</div>
                                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{row.combustivel_nome}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">
                                                    {formatDecimal(row.leitura_inicial)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-200 font-mono text-xs font-bold group-hover:text-white">
                                                    {formatDecimal(row.leitura_final)}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${isOk ? 'text-slate-600' : 'text-red-400'}`}>
                                                    {isOk ? '--' : `${isPositive ? '+' : ''}${formatDecimal(row.diferenca)} L`}
                                                </td>
                                                <td className="px-6 py-4 text-right text-blue-300 font-mono font-medium">
                                                    {formatNumber(row.vendas_registradas)} L
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isOk ? (
                                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide">
                                                            <CheckCircle2 size={12} className="mr-1" /> OK
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wide animate-pulse">
                                                            <AlertCircle size={12} className="mr-1" /> Erro
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default FechamentoMensal;

// Utility components for Icons
function Loader2({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`lucide lucide-loader-2 ${className}`}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
