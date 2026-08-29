import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Tanque } from '../types';
import { lucroPrevistoEstoque, valorBrutoEstoque } from './calculos-resumo-financeiro';

interface ResumoFinanceiroProps {
  tanques: Tanque[];
  /** Despesa operacional por litro do mês corrente (0 sem despesa lançada). */
  despesaLitro: number;
}

const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({ tanques, despesaLitro }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Bruto em Estoque</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {valorBrutoEstoque(tanques).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
          <TrendingUp size={24} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro Previsto Estimado</p>
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {lucroPrevistoEstoque(tanques, despesaLitro).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
          <TrendingUp size={24} />
        </div>
      </div>
    </div>
  );
};

export default ResumoFinanceiro;
