import React from 'react';
import { DollarSign } from 'lucide-react';

interface CardLucroProps {
    /** Soma do `lucro_liquido` dos dias; só vale quando `apurado`. */
    readonly lucro: number;
    /** `false` pela API: a rota não devolve lucro (agregacao.md §0) — o card mostra "—", nunca 0. */
    readonly apurado: boolean;
    readonly meta: number;
    readonly formatCurrency: (valor: number) => string;
}

/**
 * Card "Lucro Líquido" da aba Fechamento Mensal, saído de `index.tsx` (25/09/2026) quando ganhou o
 * estado "não apurado" do modo API. O visual e a conta da meta são os de antes.
 */
export const CardLucro: React.FC<CardLucroProps> = ({ lucro, apurado, meta, formatCurrency }) => {
    const percentual = (lucro / meta) * 100;

    return (
        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 shadow-lg hover:shadow-emerald-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100"></div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-1">Lucro Líquido</p>
                    <h3 className="text-3xl font-black text-white tracking-tight">{apurado ? formatCurrency(lucro) : '—'}</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/20">
                    <DollarSign size={24} />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Meta: {formatCurrency(meta)}</span>
                    <span className="text-emerald-400">{apurado ? `${percentual.toFixed(1)}%` : 'lucro pela API aguarda decisão'}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        style={{ width: `${apurado ? Math.min(percentual, 100) : 0}%` }}></div>
                </div>
            </div>
        </div>
    );
};
