import React, { useMemo } from 'react';
import { DadosFinanceiros } from '../hooks/useFinanceiro';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/**
 * Props do componente IndicadoresPerformance.
 */
interface IndicadoresPerformanceProps {
  /** Dados financeiros para análise */
  dados: DadosFinanceiros;
}

/**
 * Componente visual para indicadores de performance (KPIs detalhados).
 * 
 * Exibe gráfico de pizza com distribuição de despesas por categoria.
 */
export const IndicadoresPerformance: React.FC<IndicadoresPerformanceProps> = ({ dados }) => {
  const despesasPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    dados.transacoes
      .filter(t => t.tipo === 'despesa')
      .forEach(t => {
        const cat = t.categoria || 'Outros';
        mapa.set(cat, (mapa.get(cat) || 0) + t.valor);
      });

    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [dados]);

  const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Despesas por Categoria</h3>
      <div className="h-64">
        {despesasPorCategoria.length > 0 ? (
          <ResponsiveContainer width="99%" height="100%">
            <PieChart>
              <Pie
                data={despesasPorCategoria}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {despesasPorCategoria.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Sem dados de despesas
          </div>
        )}
      </div>
    </div>
  );
};
