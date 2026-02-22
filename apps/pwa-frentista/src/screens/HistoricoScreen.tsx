import React, { useEffect, useState } from 'react';
import { History, ArrowDown, ArrowUp, CheckCircle, ChevronLeft } from 'lucide-react';
import { api } from '../services/api';

interface HistoricoProps {
    frentistaId: number;
    frentistaNome: string;
    onVoltar: () => void;
}

const HistoricoScreen: React.FC<HistoricoProps> = ({ frentistaId, frentistaNome, onVoltar }) => {
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getHistoricoFrentista(frentistaId)
            .then(data => setHistorico(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [frentistaId]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-32">
            <div className="p-5 flex-1 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={onVoltar} className="w-10 h-10 rounded-full bg-[#131722] flex items-center justify-center border border-slate-800/60">
                        <ChevronLeft size={20} className="text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Histórico</h1>
                        <p className="text-sm text-slate-400">{frentistaNome} — Últimos 20 registros</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : historico.length === 0 ? (
                    <div className="bg-[#131722] rounded-3xl p-10 border border-slate-800/60 flex flex-col items-center justify-center text-center mt-10">
                        <History size={40} className="text-slate-600 mb-3" />
                        <p className="text-slate-400 font-semibold">Nenhum registro encontrado</p>
                        <p className="text-slate-500 text-xs mt-1">Este frentista ainda não enviou fechamentos</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historico.map((item: any) => {
                            const diff = item.diferenca_calculada || 0;
                            const isPositive = diff > 0;
                            const isZero = diff === 0;
                            const dataFechamento = item.fechamento?.data || '';

                            return (
                                <div key={item.id} className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 text-sm font-medium">
                                                {dataFechamento ? formatDate(dataFechamento) : '—'}
                                            </span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                      ${isZero ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                isPositive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                            {isZero ? <CheckCircle size={12} /> : isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                            {isZero ? 'Redondo' : `R$ ${formatCurrency(Math.abs(diff))}`}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Encerrante</span>
                                            <span className="text-[#A78BFA] font-semibold">R$ {formatCurrency(item.encerrante || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Conferido</span>
                                            <span className="text-white font-semibold">R$ {formatCurrency(item.valor_conferido || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">PIX</span>
                                            <span className="text-cyan-400 font-medium">R$ {formatCurrency(item.valor_pix || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Dinheiro</span>
                                            <span className="text-emerald-400 font-medium">R$ {formatCurrency(item.valor_dinheiro || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoricoScreen;
