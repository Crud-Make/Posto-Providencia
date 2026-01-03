import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Download,
    BarChart2,
    TrendingUp,
    DollarSign,
    Droplet,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Printer,
    FileText
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { usePosto } from '../contexts/PostoContext';
import {
    fechamentoService,
    leituraService,
    frentistaService,
    despesaService
} from '../services/api';


// Interfaces for component state
interface DailySummary {
    status: 'Aberto' | 'Fechado';
    vendas: number;
    litros: number;
    lucro: number;
    diferenca: number;
    frentistas: string[];
}

interface DailyTotals {
    vendas: number;
    litros: number;
    lucro: number;
    despesas: number;
    lucroLiquido: number;
    diferenca: number;
    projetadoMensal: number;
}

const DailyReportScreen: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [dailySummary, setDailySummary] = useState<DailySummary>({
        status: 'Aberto',
        vendas: 0,
        litros: 0,
        lucro: 0,
        diferenca: 0,
        frentistas: []
    });
    const [totals, setTotals] = useState<DailyTotals>({
        vendas: 0,
        litros: 0,
        lucro: 0,
        despesas: 0,
        lucroLiquido: 0,
        diferenca: 0,
        projetadoMensal: 0
    });
    const [expensesDay, setExpensesDay] = useState<any[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load basic data (sem turnos)
            const [fechamentos, leituras, despesas] = await Promise.all([
                fechamentoService.getByDate(selectedDate, postoAtivoId),
                leituraService.getByDate(selectedDate, postoAtivoId),
                despesaService.getAll(postoAtivoId)
            ]);

            // Filter expenses for the specific day
            const dayExpenses = despesas.filter(d => d.data === selectedDate);
            setExpensesDay(dayExpenses);
            const totalDespesas = dayExpenses.reduce((sum, d) => sum + Number(d.valor), 0);

            // 2. Calculate aggregate data for the day (no shift breakdown)
            let totalLitros = 0;
            let totalLucro = 0;
            let vendasCalculadas = 0;

            leituras.forEach(l => {
                const volume = Number(l.leitura_final) - Number(l.leitura_inicial);
                if (volume > 0) {
                    const precoVenda = Number(l.bico?.combustivel?.preco_venda || 0);
                    const precoCusto = Number(l.bico?.combustivel?.preco_custo || 0);
                    const lucroUnitario = precoVenda - precoCusto;

                    totalLitros += volume;
                    vendasCalculadas += volume * precoVenda;
                    totalLucro += volume * lucroUnitario;
                }
            });

            // Use total_vendas from Fechamento if available, otherwise calculated from fuel
            const totalVendasFechamento = fechamentos.reduce((sum, f) => sum + Number(f.total_vendas || 0), 0);
            const totalVendas = totalVendasFechamento > 0 ? totalVendasFechamento : vendasCalculadas;
            const totalDiferenca = fechamentos.reduce((sum, f) => sum + Number(f.diferenca || 0), 0);

            setDailySummary({
                status: fechamentos.length > 0 ? 'Fechado' : 'Aberto',
                vendas: totalVendas,
                litros: totalLitros,
                lucro: totalLucro,
                diferenca: totalDiferenca,
                frentistas: fechamentos.map(f => f.usuario?.nome).filter(Boolean)
            });

            setTotals({
                vendas: totalVendas,
                litros: totalLitros,
                lucro: totalLucro,
                despesas: totalDespesas,
                lucroLiquido: totalLucro - totalDespesas,
                diferenca: totalDiferenca,
                projetadoMensal: totalVendas * 30 // Naive projection
            });

        } catch (error) {
            console.error('Error loading daily report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDate, postoAtivoId]);

    // Format currency
    const fmtMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtLitros = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' L';

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                        Relatório Diário
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Visão consolidada de vendas, lucro e fechamentos por turno.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <Calendar className="text-blue-600" size={20} />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 font-bold"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Vendas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Vendas Totais</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{fmtMoney(totals.vendas)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {fmtLitros(totals.litros)} vendidos
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <ArrowRight size={80} className="text-red-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <ArrowRight size={20} className="rotate-90" />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Despesas do Dia</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{fmtMoney(totals.despesas)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {expensesDay.length} registros hoje
                    </p>
                </div>

                {/* Lucro Líquido */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-blue-500/20 dark:border-blue-500/30 shadow-lg shadow-blue-500/5 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} className="text-blue-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">Lucro Líquido (Real)</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{fmtMoney(totals.lucroLiquido)}</h3>
                    <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, totals.lucro > 0 ? (totals.lucroLiquido / totals.lucro) * 100 : 0)}%` }}
                        />
                    </div>
                </div>

                {/* Diferença de Caixa (Moved to 5th or shared) */}
                {/* Note: In 4 cols grid, this will wrap or need adjustment. I'll replace the Status card for now or adjust grid. */}

                {/* Diferença de Caixa */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <AlertTriangle size={80} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${totals.diferenca < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Diferença Caixa</span>
                    </div>
                    <h3 className={`text-3xl font-black ${totals.diferenca < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {fmtMoney(totals.diferenca)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Acumulado do dia
                    </p>
                </div>

                {/* Status Geral */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <CheckCircle2 size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Status do Dia</span>
                    </div>
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-300">Fechamento Diário</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${dailySummary.status === 'Fechado'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {dailySummary.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Shifts and Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Detailed Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BarChart2 size={20} className="text-blue-600" />
                                Detalhamento por Turno
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-sans">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Período</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Vendas</th>
                                        <th className="px-6 py-4 text-right">Volume</th>
                                        <th className="px-6 py-4 text-right">Lucro Est.</th>
                                        <th className="px-6 py-4 text-right">Quebra/Sobra</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            Dia Completo
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${dailySummary.status === 'Fechado'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                }`}>
                                                {dailySummary.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                            {fmtMoney(dailySummary.vendas)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 font-medium">
                                            {fmtLitros(dailySummary.litros)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-green-600 dark:text-green-400">
                                            {fmtMoney(dailySummary.lucro)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${dailySummary.diferenca < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                            {fmtMoney(dailySummary.diferenca)}
                                        </td>
                                    </tr>
                                    {/* Total Row */}
                                    <tr className="bg-gray-50 dark:bg-gray-900/50 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-700">
                                        <td className="px-6 py-4">TOTAL DO DIA</td>
                                        <td className="px-6 py-4"></td>
                                        <td className="px-6 py-4 text-right">{fmtMoney(totals.vendas)}</td>
                                        <td className="px-6 py-4 text-right">{fmtLitros(totals.litros)}</td>
                                        <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{fmtMoney(totals.lucro)}</td>
                                        <td className={`px-6 py-4 text-right ${totals.diferenca < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                            {fmtMoney(totals.diferenca)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[400px]">
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 uppercase tracking-tight">
                            <TrendingUp size={20} className="text-green-600" />
                            Resumo Financeiro do Dia
                        </h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={[{
                                name: 'Dia',
                                lucro: dailySummary.lucro,
                                diferenca: dailySummary.diferenca,
                                despesas: totals.despesas
                            }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                                <Tooltip
                                    formatter={(value: number) => fmtMoney(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="lucro" name="Lucro Bruto" fill="#10B981" radius={[4, 4, 0, 0]} barSize={60} />
                                <Bar dataKey="despesas" name="Despesas" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={60} />
                                <Bar dataKey="diferenca" name="Diferença Caixa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column: Expenses and Summary */}
                <div className="space-y-6">
                    {/* Expenses List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <DollarSign size={18} className="text-red-500" />
                                Despesas do Dia
                            </h3>
                            <span className="text-xs font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-lg">
                                {fmtMoney(totals.despesas)}
                            </span>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {expensesDay.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <FileText size={48} className="opacity-10 mb-2" />
                                    <p className="text-sm">Nenhuma despesa registrada</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {expensesDay.map((expense) => (
                                        <div key={expense.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center hover:shadow-sm transition-shadow">
                                            <div className="min-w-0 pr-2">
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{expense.descricao}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider">{expense.categoria}</div>
                                            </div>
                                            <div className="text-sm font-black text-red-500 whitespace-nowrap">
                                                - {fmtMoney(expense.valor)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Final Result Card */}
                    <div className="bg-blue-600 dark:bg-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <TrendingUp size={160} />
                        </div>
                        <h4 className="font-black opacity-80 uppercase text-[10px] tracking-widest mb-6">Fechamento do Dia</h4>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center">
                                <span className="text-sm opacity-80 font-medium">Lucro Bruto (Comb.)</span>
                                <span className="font-bold">{fmtMoney(totals.lucro)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-200">
                                <span className="text-sm opacity-80 font-medium">Total de Despesas</span>
                                <span className="font-bold">- {fmtMoney(totals.despesas)}</span>
                            </div>

                            <div className="h-px bg-white/20 w-full my-2" />

                            <div>
                                <div className="flex justify-between items-center text-2xl font-black">
                                    <span>LUCRO LÍQUIDO</span>
                                    <span>{fmtMoney(totals.lucroLiquido)}</span>
                                </div>
                                <p className="text-[10px] opacity-60 mt-1 uppercase font-bold text-right">
                                    {totals.lucroLiquido > 0 ? "Saldo Positivo" : "Saldo Negativo"}
                                </p>
                            </div>

                            <button className="w-full mt-4 bg-white/10 hover:bg-white/20 border border-white/20 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Download size={18} />
                                Baixar Relatório PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportScreen;
