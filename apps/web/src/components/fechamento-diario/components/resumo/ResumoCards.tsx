import React from 'react';
import { paraReais } from '../../../../utils/formatters';

/**
 * Propriedades do componente ResumoCards.
 */
interface ResumoCardsProps {
    /** Soma total de litros consumidos */
    totalLitros: number;
    /** Valor total de vendas registrado nos bicos */
    totalSessoes: number;
    /** Valor total de vendas registrado no caixa */
    totalPagamentos: number;
    /** Diferença matemática entre Vendas e Pagamentos */
    diferenca: number;
    /** Flag indicando se existe diferença significativa */
    temDiferenca: boolean;
    /** Classe CSS para cor da diferença (vermelho/verde/laranja) */
    corDiferenca: string;
    /** Texto explicativo da diferença (Sobra/Falta/Fechado) */
    textoDiferenca: string;
}

/**
 * Componente visual para exibir os cards de KPI (Key Performance Indicators) do resumo.
 * Exibe Total de Litros, Vendas, Pagamentos e Diferença de Caixa.
 *
 * @param props ResumoCardsProps
 * @returns React Component
 */
export const ResumoCards: React.FC<ResumoCardsProps> = ({
    totalLitros,
    totalSessoes,
    totalPagamentos,
    diferenca,
    temDiferenca,
    corDiferenca,
    textoDiferenca,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 border-y border-r border-slate-700/50">
                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Litros</p>
                <p className="text-3xl font-black text-slate-100 mt-2">{totalLitros.toFixed(2)} <span className="text-lg text-slate-500">L</span></p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-purple-500 border-y border-r border-slate-700/50">
                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Vendas (Frentistas)</p>
                <p className="text-3xl font-black text-slate-100 mt-2">{paraReais(totalSessoes)}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-emerald-500 border-y border-r border-slate-700/50">
                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Pagamentos (Caixa)</p>
                <p className="text-3xl font-black text-slate-100 mt-2">{paraReais(totalPagamentos)}</p>
            </div>
            <div className={`bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-y border-r border-slate-700/50 ${temDiferenca ? (diferenca > 0 ? 'border-l-orange-500' : 'border-l-red-500') : 'border-l-green-500'}`}>
                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{textoDiferenca}</p>
                <p className={`text-3xl font-black mt-2 ${corDiferenca}`}>{paraReais(Math.abs(diferenca))}</p>
            </div>
        </div>
    );
};
