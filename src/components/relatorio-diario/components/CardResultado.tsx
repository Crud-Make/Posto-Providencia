import React from 'react';
import { TrendingUp, Download } from 'lucide-react';
import { DailyTotals } from '../types';

interface CardResultadoProps {
    totals: DailyTotals;
    fmtMoney: (val: number) => string;
}

const CardResultado: React.FC<CardResultadoProps> = ({ totals, fmtMoney }) => {
    return (
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
    );
};

export default CardResultado;
