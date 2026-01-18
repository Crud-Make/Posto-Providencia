import React from 'react';
import { Tanque } from '../types';

interface TabelaResumoProps {
  tanques: Tanque[];
}

const TabelaResumo: React.FC<TabelaResumoProps> = ({ tanques }) => {
  const getProductColor = (productName: string): string => {
    const lowerName = productName.toLowerCase();
    if (lowerName.includes('gasolina') && lowerName.includes('aditivada')) return '#3B82F6'; // Blue
    if (lowerName.includes('gasolina')) return '#F87171'; // Red
    if (lowerName.includes('etanol')) return '#10B981'; // Green
    if (lowerName.includes('diesel') && lowerName.includes('s-10')) return '#F59E0B'; // Amber
    if (lowerName.includes('diesel')) return '#D97706'; // Dark Amber
    return '#6B7280'; // Gray
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white">Resumo Detalhado</h3>
        <button className="text-blue-600 text-sm hover:underline">Ver Relatório Completo</button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
          <tr>
            <th className="px-6 py-3">Tanque</th>
            <th className="px-6 py-3">Produto</th>
            <th className="px-6 py-3 text-right">Capacidade</th>
            <th className="px-6 py-3 text-right">Estoque Atual</th>
            <th className="px-6 py-3 text-right">Valor Estoque</th>
            <th className="px-6 py-3 text-right">Lucro Previsto</th>
            <th className="px-6 py-3 text-right">Disponível (%)</th>
            <th className="px-6 py-3 text-right">Para Encher</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {tanques.map(t => {
            const percent = t.capacidade > 0 ? (t.estoque_atual / t.capacidade) * 100 : 0;
            const productColor = getProductColor(t.combustivel?.nome || '');
            return (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{t.nome}</td>
                <td className="px-6 py-3">
                  <span
                    className="font-semibold px-2 py-1 rounded"
                    style={{ color: productColor }}
                  >
                    {t.combustivel?.nome}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-mono">{t.capacidade.toLocaleString()} L</td>
                <td className="px-6 py-3 text-right font-mono font-bold">{t.estoque_atual.toLocaleString()} L</td>
                <td className="px-6 py-3 text-right font-mono text-gray-600 dark:text-gray-300">
                  {(t.estoque_atual * (t.combustivel?.preco_custo || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-3 text-right font-mono text-green-600 font-bold">
                  {(t.estoque_atual * ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-3 text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${percent < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {percent.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-mono text-gray-500">
                  {(t.capacidade - t.estoque_atual).toLocaleString()} L
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TabelaResumo;
