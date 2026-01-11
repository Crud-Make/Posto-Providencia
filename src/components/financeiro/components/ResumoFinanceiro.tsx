import React from 'react';
import KPICard from '../../KPICard';
import { DadosFinanceiros } from '../hooks/useFinanceiro';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

/**
 * Props do componente ResumoFinanceiro.
 */
interface ResumoFinanceiroProps {
  /** Dados financeiros agregados para exibição */
  dados: DadosFinanceiros;
  /** Estado de carregamento para exibir skeletons */
  carregando?: boolean;
}

/**
 * Componente de resumo financeiro com Cards KPI.
 * 
 * Exibe Receita Total, Despesas Totais, Lucro Líquido e Margem de Lucro.
 */
export const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({ dados, carregando }) => {
  if (carregando) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatPercent = (val: number) => 
    `${val.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Receita Total"
        value={formatCurrency(dados.receitas.total)}
        trendValue=""
        trendLabel="vs período anterior"
        Icon={DollarSign}
        iconBgColor="bg-green-100 dark:bg-green-900/30"
        iconColor="text-green-600 dark:text-green-400"
      />

      <KPICard
        title="Despesas Totais"
        value={formatCurrency(dados.despesas.total)}
        trendValue=""
        trendLabel="vs período anterior"
        isNegativeTrend={false} // Despesa alta não necessariamente é trend negativa no card, mas semanticamente...
        Icon={TrendingDown}
        iconBgColor="bg-red-100 dark:bg-red-900/30"
        iconColor="text-red-600 dark:text-red-400"
      />

      <KPICard
        title="Lucro Líquido"
        value={formatCurrency(dados.lucro.liquido)}
        trendValue={formatPercent(dados.lucro.margem)}
        trendLabel="Margem Líquida"
        isNegativeTrend={dados.lucro.liquido < 0}
        Icon={Wallet}
        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
      />

      <KPICard
        title="Margem de Lucro"
        value={formatPercent(dados.lucro.margem)}
        trendValue=""
        trendLabel="Eficiência Operacional"
        Icon={TrendingUp}
        iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        iconColor="text-purple-600 dark:text-purple-400"
      />
    </div>
  );
};
