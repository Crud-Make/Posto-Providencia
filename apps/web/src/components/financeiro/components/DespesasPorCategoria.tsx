import React, { useMemo } from 'react';
import { DadosFinanceiros } from '../hooks/useFinanceiro';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/**
 * Props do componente DespesasPorCategoria.
 */
interface DespesasPorCategoriaProps {
  /** Dados financeiros para análise */
  dados: DadosFinanceiros;
}

/**
 * Distribuição das despesas do período por categoria (Top 5), em gráfico de pizza.
 *
 * @remarks [31/07] Renomeado de `IndicadoresPerformance`. O nome antigo prometia KPIs de
 *          performance e o componente sempre desenhou só despesas por categoria — o título
 *          na tela já dizia isso desde o início.
 */
export const DespesasPorCategoria: React.FC<DespesasPorCategoriaProps> = ({ dados }) => {
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
    <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-6">Despesas por Categoria</h3>
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
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9'
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Sem dados de despesas
          </div>
        )}
      </div>
    </div>
  );
};
