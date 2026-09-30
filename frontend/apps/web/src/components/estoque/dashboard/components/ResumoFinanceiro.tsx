import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Tanque } from '../types';
import { faltaCusto, lucroPrevistoEstoque, valorBrutoEstoque } from './calculos-resumo-financeiro';

const emReais = (valor: number): string => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** No lugar do número quando algum tanque com litros está sem custo: o total seria inventado. */
const SemCusto: React.FC = () => (
  <>
    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">Falta o custo</h3>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Informe o custo por litro em Bombas e Bicos → Combustíveis.</p>
  </>
);

interface ResumoFinanceiroProps {
  tanques: Tanque[];
  /** Despesa operacional por litro do mês corrente (0 sem despesa lançada). */
  despesaLitro: number;
}

const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({ tanques, despesaLitro }) => {
  const semCusto = tanques.some(faltaCusto);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Bruto em Estoque</p>
          {semCusto ? <SemCusto /> : (
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{emReais(valorBrutoEstoque(tanques))}</h3>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
          <TrendingUp size={24} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro Previsto Estimado</p>
          {semCusto ? <SemCusto /> : (
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{emReais(lucroPrevistoEstoque(tanques, despesaLitro))}</h3>
          )}
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
          <TrendingUp size={24} />
        </div>
      </div>
    </div>
  );
};

export default ResumoFinanceiro;
