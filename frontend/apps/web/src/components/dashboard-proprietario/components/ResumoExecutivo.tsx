import React from 'react';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '@posto/utils';
import { ResumoFinanceiro } from '../types';

interface ResumoExecutivoProps {
  dados: ResumoFinanceiro;
  /**
   * Nome do período exibido — "Hoje", "Janeiro/2026"…
   *
   * @remarks Era literal `"Hoje"` nos três cartões. Com o seletor de mês o painel
   *          passou a mostrar mês fechado nos mesmos cartões, e o rótulo dizia
   *          "Vendas Hoje" sobre o valor do mês inteiro. Rótulo que mente sobre o
   *          período é o mesmo defeito da aba "7 Dias" que exibia o mês.
   */
  periodoLabel: string;
}

export const ResumoExecutivo: React.FC<ResumoExecutivoProps> = ({ dados, periodoLabel }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Vendas do período */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-100 text-sm font-medium font-display uppercase tracking-wider">
            Vendas · {periodoLabel}
          </span>
          <div className="p-2 bg-white/20 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{formatCurrency(dados.vendas)}</p>
        <p className="text-blue-200 text-sm mt-1">
          Receita de {periodoLabel}
        </p>
      </div>

      {/* Lucro do período */}
      <div className={`bg-gradient-to-br ${dados.lucroReal < 0 ? 'from-red-500 to-red-700' : 'from-green-500 to-green-700'} rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300 delay-100`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-green-100 text-sm font-medium font-display uppercase tracking-wider">
            {dados.temDespesa ? 'Lucro Real' : 'Lucro Bruto'} · {periodoLabel}
          </span>
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-3xl font-bold font-finance tracking-tight">{formatCurrency(dados.lucroReal)}</p>
        <p className="text-green-200 text-sm mt-1">
          {dados.temDespesa
            ? `Margem real: ${dados.margemMedia.toFixed(1)}%`
            : 'Sem despesa lançada — valor bruto'}
        </p>
      </div>

      {/* Frentistas */}
      <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white animate-in fade-in zoom-in duration-300 delay-200">
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
