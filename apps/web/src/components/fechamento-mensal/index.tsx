import React, { useState, useEffect, useMemo } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { fechamentoMensalService, FechamentoMensalResumo, EncerranteMensal } from '../../services/api/fechamentoMensal.service';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity, ArrowLeft, Target, BarChart2, Droplet, AlertCircle, CheckCircle2 } from 'lucide-react';
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


    const loadData = async () => {
        if (!postoAtivo?.id) return;

        try {
            setLoading(true);
            const [ano, mes] = selectedMonth.split('-').map(Number);

            const [resumo, enc] = await Promise.all([
                fechamentoMensalService.getResumoMensal(postoAtivo.id, mes, ano),
                fechamentoMensalService.getEncerrantesMensal(postoAtivo.id, mes, ano)
            ]);

            setDados(resumo);
            setEncerrantes(enc);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [postoAtivo, selectedMonth]);

    return (
        <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans ${isEmbedded ? 'bg-transparent min-h-0' : 'p-6 md:p-8'}`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                {!isEmbedded ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Fechamento Mensal
                            </h1>
                            <p className="text-slate-500 text-sm">Dashboard consolidado e análise de encerrantes</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                            <BarChart2 size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-200">Painel Gerencial</h2>
                    </div>
                )}

                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 pr-4 shadow-lg shadow-black/20">
                    <div className="p-2 bg-slate-800 rounded-lg mr-2 text-blue-400">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-medium text-slate-200"
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-slate-400 bg-slate-900/20 rounded-3xl border border-slate-800 animate-pulse">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={40} className="animate-spin text-blue-500" />
                        <p className="font-medium">Carregando inteligência de dados...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Lucro */}
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</p>
                                    <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(totalizers.lucro)}</h3>
                                </div>
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                    <DollarSign size={20} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>Meta: {formatCurrency(metaLucro)}</span>
                                    <span>Projeção: {formatCurrency(projectedProfit)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                        style={{ width: `${Math.min((totalizers.lucro / metaLucro) * 100, 100)}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 text-right">
                                    {((totalizers.lucro / metaLucro) * 100).toFixed(1)}% atingido
                                </p>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Total</p>
                                    <h3 className="text-2xl font-black text-white mt-1">{formatNumber(totalizers.volume)} <span className="text-sm font-normal text-slate-500">L</span></h3>
                                </div>
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Droplet size={20} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>Meta: {formatNumber(metaVolume)} L</span>
                                    <span>Proj: {formatNumber(projectedVolume)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                                        style={{ width: `${Math.min((totalizers.volume / metaVolume) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Faturamento */}
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento</p>
                                    <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(totalizers.faturamento)}</h3>
                                </div>
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <p className="text-xs text-slate-400 flex justify-between">
                                    <span>Ticket Médio (Est):</span>
                                    <span className="text-purple-300 font-bold">R$ 5,39 / L</span>
                                </p>
                            </div>
                        </div>

                        {/* Projeção Card */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-2 text-amber-400">
                                <Target size={18} />
                                <span className="font-bold text-xs uppercase tracking-wider">Projeção do Mês</span>
                            </div>
                            <h3 className="text-3xl font-black text-white mt-2">
                                {formatCurrency(projectedProfit)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">
                                Baseado na média diária de {formatCurrency(totalizers.lucro / daysPassed)}
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                        {/* Daily Trend Chart (Area) */}
                        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-blue-500" />
                                Evolução de Vendas Diárias
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dataGraficoDiario}>
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
                                        <XAxis dataKey="dia" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '12px' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                        />
                                        <Area type="monotone" dataKey="vendas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVendas)" name="Faturamento" strokeWidth={2} />
                                        <Area type="monotone" dataKey="lucro" stroke="#10b981" fillOpacity={1} fill="url(#colorLucro)" name="Lucro Líq." strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Mix Chart (Pie) */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                <Droplet size={16} className="text-purple-500" />
                                Mix de Vendas (Volume)
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dataMixCombustivel}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dataMixCombustivel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                            formatter={(value: number) => formatNumber(value) + ' L'}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Seção de Encerrantes */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <TrendingUp size={16} className="text-fuchsia-500" />
                                Controle de Encerrantes (Auditável)
                            </h3>
                            <div className="flex gap-2 text-xs">
                                <span className="flex items-center text-emerald-400 gap-1"><CheckCircle2 size={12} /> Normal</span>
                                <span className="flex items-center text-red-400 gap-1"><AlertCircle size={12} /> Divergente</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-900/80 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                        <th className="px-6 py-4">Bico / Produto</th>
                                        <th className="px-6 py-4 text-right">Enc. Inicial ({formatDate(`${selectedMonth}-01`)})</th>
                                        <th className="px-6 py-4 text-right">Enc. Atual</th>
                                        <th className="px-6 py-4 text-right">Diferença (Bomba)</th>
                                        <th className="px-6 py-4 text-right">Vendas Lançadas</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {encerrantes.map((row, idx) => {
                                        const isOk = Math.abs(row.diferenca) < 1; // 1 litro tolerance
                                        return (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-200">{row.bico_nome}</div>
                                                    <div className="text-xs text-slate-500">{row.combustivel_nome}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">
                                                    {formatDecimal(row.leitura_inicial)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-200 font-mono text-xs font-bold">
                                                    {formatDecimal(row.leitura_final)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-blue-300 font-mono">
                                                    {formatNumber(row.leitura_final - row.leitura_inicial)} L
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                                    {formatNumber(row.vendas_registradas)} L
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isOk ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                                                            <CheckCircle2 size={14} />
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400" title={`Diferença: ${formatDecimal(row.diferenca)}`}>
                                                            <AlertCircle size={14} />
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
