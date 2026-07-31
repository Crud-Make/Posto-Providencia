import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SerieFluxoCaixa } from '../hooks/useFluxoCaixa';

/**
 * Props do componente GraficoFluxoCaixa.
 */
interface GraficoFluxoCaixaProps {
  /** Séries de dados para plotagem */
  series: SerieFluxoCaixa[];
  /** Altura do gráfico em pixels (default: 400) */
  altura?: number;
}

/**
 * Componente gráfico para visualização do fluxo de caixa.
 *
 * Utiliza gráfico de área para comparar Receitas x Despesas ao longo do tempo.
 */
export const GraficoFluxoCaixa: React.FC<GraficoFluxoCaixaProps> = ({ series, altura = 400 }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (series.length === 0) {
    return (
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 h-[400px] flex items-center justify-center text-slate-500">
        Sem dados para exibir no período
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 h-full">
      <h3 className="text-lg font-bold text-white mb-6">Fluxo de Caixa</h3>
      <div style={{ height: altura }}>
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
            <XAxis
              dataKey="data"
              tickFormatter={formatDate}
              stroke="#94A3B8"
              fontSize={12}
            />
            <YAxis
              tickFormatter={(val) => `R$ ${val / 1000}k`}
              stroke="#94A3B8"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#F1F5F9'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="receitas"
              name="Receitas"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#colorReceita)"
            />
            <Area
              type="monotone"
              dataKey="despesas"
              name="Despesas"
              stroke="#EF4444"
              fillOpacity={1}
              fill="url(#colorDespesa)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
