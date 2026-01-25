import React from 'react';
import { Receipt, PiggyBank, ArrowUpRight } from 'lucide-react';
import { ResumoFinanceiro } from '../types';

interface DemonstrativoFinanceiroProps {
  dados: ResumoFinanceiro;
}

export const DemonstrativoFinanceiro: React.FC<DemonstrativoFinanceiroProps> = ({ dados }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <span className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </span>
            Fluxo de Caixa Mensal
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Análise consolidada de entradas e saídas do período
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Conectores Visuais (Desktop) */}
        <div className="hidden md:block absolute top-1/2 left-1/3 w-8 h-8 -ml-4 -mt-4 text-gray-300 dark:text-gray-600 z-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </div>
        <div className="hidden md:block absolute top-1/2 right-1/3 w-8 h-8 -mr-4 -mt-4 text-gray-300 dark:text-gray-600 z-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </div>

        {/* 1. Entradas (Lucro Bruto/Geração de Caixa) */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30 relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-24 h-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 font-display">
              Geração de Caixa (Margem)
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-finance tracking-tight">
              {formatCurrency(dados.lucroEstimado)}
            </p>

            <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Vendas Brutas:</span>
                <span className="font-medium font-finance">{formatCurrency(dados.vendas)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                <span>Margem Média:</span>
                <span>~{dados.margemMedia.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Saídas (Despesas) */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-6 border border-amber-100 dark:border-amber-800/30 relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PiggyBank className="w-24 h-24 text-amber-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 font-display">
              Despesas Operacionais
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-finance tracking-tight">
              {formatCurrency(dados.despesas)}
            </p>

            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Total de gastos registrados e pendentes de pagamento no período.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Resultado Final */}
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Receipt className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 font-display">
              Resultado Líquido Est.
            </p>
            <p className={`text-3xl font-bold ${(dados.lucroEstimado - dados.despesas) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-finance tracking-tight`}>
              {formatCurrency(dados.lucroEstimado - dados.despesas)}
            </p>

            <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${(dados.lucroEstimado - dados.despesas) >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
                  {(dados.lucroEstimado - dados.despesas) >= 0 ? 'LUCRO' : 'PREJUÍZO'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Projeção atual
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
