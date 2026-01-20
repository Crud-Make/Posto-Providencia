import React from 'react';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import { ResumoFinanceiro } from '../types';

interface ResumoExecutivoProps {
  dados: ResumoFinanceiro;
}

export const ResumoExecutivo: React.FC<ResumoExecutivoProps> = ({ dados }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Vendas Hoje */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-100 text-sm font-medium font-display uppercase tracking-wider">Vendas Hoje</span>
          <div className="p-2 bg-white/20 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{formatCurrency(dados.vendas)}</p>
        <p className="text-blue-200 text-sm mt-1">
          Performance de hoje
        </p>
      </div>

      {/* Lucro Estimado */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300 delay-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-green-100 text-sm font-medium font-display uppercase tracking-wider">Lucro Est. Hoje</span>
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{formatCurrency(dados.lucroEstimado)}</p>
        <p className="text-green-200 text-sm mt-1">
          Margem média: {dados.margemMedia.toFixed(1)}%
        </p>
      </div>

      {/* Dívidas Totais */}
      <div className={`rounded-2xl p-5 animate-in fade-in zoom-in duration-300 delay-200 ${dados.dividas > 0
          ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white'
        }`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-medium font-display uppercase tracking-wider ${dados.dividas > 0 ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
            Dívidas Totais
          </span>
          <div className={`p-2 rounded-lg ${dados.dividas > 0 ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{formatCurrency(dados.dividas)}</p>
        <p className={`text-sm mt-1 ${dados.dividas > 0 ? 'text-red-200' : 'text-gray-400'}`}>
          {dados.dividas > 0 ? 'Em aberto' : 'Sem pendências ✓'}
        </p>
      </div>

      {/* Frentistas */}
      <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300 delay-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-purple-100 text-sm font-medium font-display uppercase tracking-wider">Equipe Total</span>
          <div className="p-2 bg-white/20 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{dados.frentistasAtivos}</p>
        <p className="text-purple-200 text-sm mt-1">
          Frentistas ativos
        </p>
      </div>
    </div>
  );
};
