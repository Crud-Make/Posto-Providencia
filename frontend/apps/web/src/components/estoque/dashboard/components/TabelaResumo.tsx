import React from 'react';
import { corDoProduto } from '@posto/utils';
import { Tanque } from '../types';
import { faltaCusto, lucroPrevistoEstoque, valorBrutoEstoque } from './calculos-resumo-financeiro';

interface TabelaResumoProps {
  tanques: Tanque[];
  /** Despesa operacional por litro do mês — a mesma do card; a linha usa a conta do card (30/09). */
  despesaLitro: number;
}

const emReais = (valor: number): string => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TabelaResumo: React.FC<TabelaResumoProps> = ({ tanques, despesaLitro }) => {
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
            const productColor = corDoProduto(t.combustivel?.codigo).fundo;
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
                  {faltaCusto(t) ? 'Falta o custo' : emReais(valorBrutoEstoque([t]))}
                </td>
                <td className="px-6 py-3 text-right font-mono text-green-600 font-bold">
                  {faltaCusto(t) ? '—' : emReais(lucroPrevistoEstoque([t], despesaLitro))}
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
