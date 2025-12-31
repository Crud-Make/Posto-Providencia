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
    turnoService,
    frentistaService
} from '../services/api';


// Interfaces for component state
interface ShiftData {
    turnoName: string;
    turnoId: number;
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
    diferenca: number;
    projetadoMensal: number;
}

const DailyReportScreen: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [shiftsData, setShiftsData] = useState<ShiftData[]>([]);
    const [totals, setTotals] = useState<DailyTotals>({
        vendas: 0,
        litros: 0,
        lucro: 0,
        diferenca: 0,
        projetadoMensal: 0
    });

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Load basic data
            const [fechamentos, leituras, turnos] = await Promise.all([
                fechamentoService.getByDate(selectedDate, postoAtivoId),
                leituraService.getByDate(selectedDate, postoAtivoId),
                turnoService.getAll(postoAtivoId)
            ]);

            // 2. Process Shifts
            const processedShifts: ShiftData[] = turnos.map(turno => {
                const fechamento = fechamentos.find(f => f.turno_id === turno.id);
                const leiturasTurno = leituras.filter(l => l.turno_id === turno.id);

                // Calculate Fuel Sales & Profit from Readings
                let litrosTurno = 0;
                let lucroTurno = 0;
                let vendasCalculadas = 0;

                leiturasTurno.forEach(l => {
                    const volume = Number(l.leitura_final) - Number(l.leitura_inicial);
                    if (volume > 0) {
                        // Preços baseados no cadastro atual do combustível
                        // Nota: Idealmente usaríamos histórico de preços se disponível
                        const precoVenda = Number(l.bico?.combustivel?.preco_venda || 0);
                        const precoCusto = Number(l.bico?.combustivel?.preco_custo || 0);
                        const lucroUnitario = precoVenda - precoCusto;

                        vendasCalculadas += volume * precoVenda;
                        lucroTurno += volume * lucroUnitario;
                    }
                });

                // Use total_vendas from Fechamento if available (includes products), otherwise calculated from fuel
                const totalVendas = fechamento ? Number(fechamento.total_vendas) : vendasCalculadas;

                // If Fechamento includes products, we should ideally add product profit too
                // For now, we stick to fuel profit as the main indicator or approximate

                return {
                    turnoName: turno.nome,
                    turnoId: turno.id,
                    status: fechamento ? 'Fechado' : 'Aberto',
                    vendas: totalVendas,
                    litros: litrosTurno,
                    lucro: lucroTurno, // This is fuel profit primarily
                    diferenca: fechamento ? Number(fechamento.diferenca) : 0,
                    frentistas: fechamento?.usuario ? [fechamento.usuario.nome] : [] // Simplification
                };
            });

            setShiftsData(processedShifts);

            // 3. Calculate Totals
            const totalVendas = processedShifts.reduce((acc, curr) => acc + curr.vendas, 0);
            const totalLitros = processedShifts.reduce((acc, curr) => acc + curr.litros, 0);
            const totalLucro = processedShifts.reduce((acc, curr) => acc + curr.lucro, 0);
            const totalDiferenca = processedShifts.reduce((acc, curr) => acc + curr.diferenca, 0);

            setTotals({
                vendas: totalVendas,
                litros: totalLitros,
                lucro: totalLucro,
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

                {/* Lucro Estimado */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Lucro Estimado</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">{fmtMoney(totals.lucro)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Margem aprox. {totals.vendas > 0 ? ((totals.lucro / totals.vendas) * 100).toFixed(1) : 0}%
                    </p>
                </div>

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
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Status</span>
                    </div>
                    <div className="space-y-2 mt-2">
                        {shiftsData.map(shift => (
                            <div key={shift.turnoId} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-300">{shift.turnoName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${shift.status === 'Fechado'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    {shift.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vendas por Turno */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-blue-600" />
                        Performance por Turno
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={shiftsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="turnoName" tickLine={false} axisLine={false} />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                tickFormatter={(value) => `R$${value / 1000}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={(value) => `${value}L`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => [
                                    name === 'vendas' ? fmtMoney(value) : fmtLitros(value),
                                    name === 'vendas' ? 'Vendas' : 'Volume'
                                ]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="vendas" name="Vendas (R$)" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar yAxisId="right" dataKey="litros" name="Volume (L)" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Lucro vs Diferença */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-600" />
                        Lucratividade vs Quebras
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={shiftsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="turnoName" tickLine={false} axisLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                            <Tooltip formatter={(value: number) => fmtMoney(value)} />
                            <Legend />
                            <Bar dataKey="lucro" name="Lucro Bruto" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="diferenca" name="Diferença Caixa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Detalhamento por Turno
                    </h3>
                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                        <FileText size={16} /> Exportar CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Turno</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Vendas</th>
                                <th className="px-6 py-4 text-right">Volume</th>
                                <th className="px-6 py-4 text-right">Lucro Est.</th>
                                <th className="px-6 py-4 text-right">Quebra/Sobra</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {shiftsData.map((shift) => (
                                <tr key={shift.turnoId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                        {shift.turnoName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shift.status === 'Fechado'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                            }`}>
                                            {shift.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                                        {fmtMoney(shift.vendas)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                                        {fmtLitros(shift.litros)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                        {fmtMoney(shift.lucro)}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${shift.diferenca < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                        {fmtMoney(shift.diferenca)}
                                    </td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="bg-gray-50 dark:bg-gray-700/50 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-gray-600">
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
        </div>
    );
};

export default DailyReportScreen;
