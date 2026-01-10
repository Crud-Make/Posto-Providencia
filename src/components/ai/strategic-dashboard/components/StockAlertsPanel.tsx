// [10/01 08:52] Componente para exibir alertas de estoque
import React from 'react';
import { Fuel } from 'lucide-react';
import { StockAlert } from '../types';

interface StockAlertsPanelProps {
    stockAlerts: StockAlert[];
}

export const StockAlertsPanel: React.FC<StockAlertsPanelProps> = ({ stockAlerts }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Status do Estoque</h2>
                <Fuel className="w-5 h-5 text-slate-400" />
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
