/**
 * Componente de Gestão de Bicos - Dashboard de Performance
 * 
 * @remarks
 * Exibe métricas detalhadas de volume, faturamento e margem por bico e combustível.
 * Segue o padrão "Premium Dashboard" com visualização rica e interativa.
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.1.0
 */

import React from 'react';
import { TrendingUp, Download, Search } from 'lucide-react';
import { BicoComDetalhes } from '../../../types/fechamento';
import { useCalculoGestaoBicos } from '../hooks/useCalculoGestaoBicos';

// --- Helpers de Formatação ---
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

// --- Tipos ---
interface LeituraMap {
    [bicoId: number]: {
        leitura_inicial?: number | string;
        leitura_final?: number | string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    };
}

interface TabGestaoBicosProps {
    bicos: BicoComDetalhes[];
    leituras: LeituraMap;
    loading?: boolean;
}

/**
 * TabGestaoBicos
 * Renderiza o dashboard de gestão de bicos.
 */
export const TabGestaoBicos: React.FC<TabGestaoBicosProps> = ({
    bicos,
    leituras,
    loading
}) => {
    // Separação de Lógica: Hook customizado para cálculos
    const dadosConsolidados = useCalculoGestaoBicos(bicos, leituras);

    const metaLucroGlobal = 60000; // Meta MOCKADA (Ideal: vir de parâmetro/backend)
    const percentualLucro = Math.min((dadosConsolidados.lucroTotal / metaLucroGlobal) * 100, 100);

    if (loading) {
        return (
            <div className="p-20 text-center text-slate-400 bg-slate-900/20 rounded-3xl border border-slate-800 animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="font-medium">Carregando dados de performance...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans text-slate-100">
            {/* Header Cards: KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* KPI 1: Meta de Lucro Global */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-blue-500" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        Meta de Lucro Global
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px]">MENSAL</span>
                    </span>
                    <div className="flex items-end gap-3 mt-2">
                        <span className="text-2xl font-black text-white">
                            {formatCurrency(dadosConsolidados.lucroTotal)}
                        </span>
                        <span className="text-xs text-slate-500 mb-1 font-medium">
                            / {formatCurrency(metaLucroGlobal)}
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${percentualLucro}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-2 font-bold text-right pt-1">{percentualLucro.toFixed(1)}% Atingido</p>
                </div>

                {/* KPI 2: Volume Total */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={48} className="text-green-500" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Volume Total</span>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-white">
                            {formatNumber(dadosConsolidados.volumeTotal)} <span className="text-sm font-normal text-slate-500">L</span>
                        </span>
                        <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            <TrendingUp size={10} /> +2.4%
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                        Volume acumulado no fechamento atual considerando todas as ilhas ativas.
                    </p>
                </div>

                {/* KPI 3: Faturamento Total */}
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Download size={48} className="text-purple-500" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faturamento Total</span>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-white">
                            {formatCurrency(dadosConsolidados.faturamentoTotal)}
                        </span>
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold">
                            HOJE
                        </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-2">
                            <Download size={12} /> EXPORTAR RELATÓRIO
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Grid: Gráficos e Tabelas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[400px]">
                {/* Gráfico 1: Volume por Combustível (Barras) */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Volume por Combustível
                    </h3>
                    <div className="relative flex-1 w-full border-b border-l border-slate-800 flex items-end justify-around px-4 pb-0 min-h-[200px] gap-4">
                        {Object.entries(dadosConsolidados.porCombustivel).length > 0 ? (
                            Object.entries(dadosConsolidados.porCombustivel).map(([nome, dados], idx) => {
                                // Encontrar o maior volume para normalizar as alturas
                                const maxVolume = Math.max(...Object.values(dadosConsolidados.porCombustivel).map(d => d.volume), 1);
                                const altura = Math.max((dados.volume / maxVolume) * 100, 5); // Mínimo 5% altura

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2 group w-full max-w-[60px]">
                                        <div className="relative w-full h-[180px] bg-slate-800/30 rounded-t-lg overflow-hidden flex items-end">
                                            <div
                                                className="w-full transition-all duration-1000 ease-out rounded-t-lg opacity-80 group-hover:opacity-100 relative group-hover:shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                                                style={{
                                                    height: `${altura}%`,
                                                    backgroundColor: dados.cor,
                                                    boxShadow: `0 0 10px ${dados.cor}40`
                                                }}
                                            >
                                                <div className="absolute -top-6 w-full text-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {formatNumber(dados.volume)}L
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate w-full text-center max-w-[60px]" title={nome}>
                                                {nome.split(' ')[0]}
                                            </span>
                                            {nome.split(' ').length > 1 && (
                                                <span className="text-[9px] text-slate-600 uppercase tracking-tighter truncate w-full text-center max-w-[60px]">
                                                    {nome.split(' ').slice(1).join(' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic">
                                Aguardando dados...
                            </div>
                        )}
                    </div>
                </div>

                {/* Gráfico 2: Metas por Categoria */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Metas do Mês (Categorias)
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(dadosConsolidados.porCombustivel).map(([nome, dados], idx) => {
                            const percent = Math.min((dados.faturamento / dados.meta) * 100, 100);
                            const percentDisplay = Math.min((dados.faturamento / 300000) * 100, 100).toFixed(1);

                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{nome}</span>
                                        <span className="text-xs font-black" style={{ color: dados.cor }}>
                                            {percentDisplay}% <span className="text-slate-500 font-normal">({formatCurrency(dados.faturamento)})</span>
                                        </span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${percentDisplay}%`, backgroundColor: dados.cor }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(dadosConsolidados.porCombustivel).length === 0 && (
                            <p className="text-slate-500 text-sm italic py-4">Nenhum dado de combustível registrado.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela de Bicos */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Desempenho de Bicos
                    </h2>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                            className="bg-slate-900 border border-slate-700 rounded-full pl-10 py-1.5 text-xs w-full sm:w-64 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-slate-200 placeholder-slate-600"
                            placeholder="Buscar bico ou combustível..."
                            type="text"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-900/50">
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">ID Bico</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Combustível</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Volume (L)</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Faturamento</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Margem Est.</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Lucro Bruto</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {dadosConsolidados.listaBicos.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-white">#{item.numero}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full w-fit border ${item.status === 'Ativo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Ativo' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-200 font-medium">{item.combustivel}</span>
                                            <span className="text-[10px] text-slate-500">{item.ilha}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-white">{formatNumber(item.volume)}</td>
                                    <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(item.faturamento)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1 font-bold text-sm">
                                            <span className={item.margem < 10 ? 'text-red-400' : 'text-green-400'}>{item.margem.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black group-hover:scale-105 transition-transform" style={{ color: item.margem < 10 ? '#EF4444' : '#22C55E' }}>
                                        {formatCurrency(item.lucro)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="w-24 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.performance < 30 ? 'bg-red-500' : item.performance < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                style={{ width: `${item.performance}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {dadosConsolidados.listaBicos.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                                        Nenhum bico encontrado ou carregado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
