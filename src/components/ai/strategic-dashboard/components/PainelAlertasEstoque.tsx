// [10/01 08:34] Componente de painel de alertas de estoque
// [10/01 17:14] Adicionado JSDoc completo
import React from 'react';
import { AlertTriangle, Droplet } from 'lucide-react';
import { StockAlert } from '../types';

/**
 * Props do componente PainelAlertasEstoque
 * @interface PainelAlertasEstoqueProps
 */
interface PainelAlertasEstoqueProps {
    /** Lista de alertas de estoque de combustível */
    stockAlerts: StockAlert[];
}

/**
 * Componente que exibe alertas de nível de estoque de combustíveis.
 * Mostra status visual (OK, BAIXO, CRÍTICO) e dias restantes estimados.
 * 
 * @component
 * @param {PainelAlertasEstoqueProps} props - Props do componente
 * @returns {JSX.Element} Painel com alertas de estoque
 */
export const PainelAlertasEstoque: React.FC<PainelAlertasEstoqueProps> = ({ stockAlerts }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Status do Estoque</h2>
                <AlertTriangle className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
                {stockAlerts.length > 0 ? stockAlerts.map((stock, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-10 rounded-full ${stock.status === 'CRÍTICO' ? 'bg-red-500' :
                                stock.status === 'BAIXO' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}></div>
                            <div>
                                <p className="font-medium text-slate-800 dark:text-white text-sm">{stock.combustivel}</p>
                                <p className="text-xs text-slate-500">{stock.diasRestantes} dias restantes</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold text-sm ${stock.status === 'CRÍTICO' ? 'text-red-600' :
                                stock.status === 'BAIXO' ? 'text-amber-600' : 'text-emerald-600'
                                }`}>{stock.percentual.toFixed(0)}%</p>
                            <p className="text-xs text-slate-400">{stock.status}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-slate-500 py-4">Nenhum dado de estoque disponível</p>
                )}
            </div>
        </div>
    );
};
