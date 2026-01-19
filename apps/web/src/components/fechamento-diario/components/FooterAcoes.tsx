import React from 'react';
import { Save as SaveIcon, Loader2 } from 'lucide-react';

interface FooterAcoesProps {
    totalVendas: number;
    totalFrentistas: number;
    diferenca: number;
    saving: boolean;
    podeFechar: boolean;
    handleSave: () => void;
}

export const FooterAcoes: React.FC<FooterAcoesProps> = ({
    totalVendas,
    totalFrentistas,
    diferenca,
    saving,
    podeFechar,
    handleSave
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 p-4 shadow-2xl z-40 print:hidden text-white">
            {/* // [19/01 00:37] Ajuste de layout: Footer agora usa largura total. */}
            {/* Motivo: Evitar conteúdo comprimido no centro em telas grandes. */}
            <div className="w-full px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                <div className="flex gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vendas (Bomba)</p>
                        <p className="text-xl font-bold text-blue-400 font-mono">
                            {totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Apurado (Frentistas)</p>
                        <p className={`text-xl font-bold font-mono ${diferenca < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {totalFrentistas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 border-l-4 border-l-orange-500/50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Diferença</p>
                        <p className={`text-xl font-bold font-mono ${diferenca < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || !podeFechar}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <SaveIcon size={18} />}
                    Salvar Fechamento
                </button>
            </div>
        </div>
    );
};
