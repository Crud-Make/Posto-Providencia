import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Tanque } from '../types';

interface ResumoFinanceiroProps {
  tanques: Tanque[];
}

const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({ tanques }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Bruto em Estoque</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {tanques.reduce((acc, t) => acc + (t.estoque_atual * (t.combustivel?.preco_custo || 0)), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
            {tanques.reduce((acc, t) => acc + (t.estoque_atual * ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0))), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
