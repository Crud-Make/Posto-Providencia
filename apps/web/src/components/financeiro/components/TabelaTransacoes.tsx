import React, { useState } from 'react';
import { Transacao } from '../hooks/useFinanceiro';
import { ArrowUpCircle, ArrowDownCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Props do componente TabelaTransacoes.
 */
interface TabelaTransacoesProps {
  /** Lista de transações a serem exibidas */
  transacoes: Transacao[];
}

/**
 * Tabela detalhada de transações financeiras.
 * 
 * Oferece paginação e exportação para CSV.
 */
export const TabelaTransacoes: React.FC<TabelaTransacoesProps> = ({ transacoes }) => {
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 20;

  const totalPaginas = Math.ceil(transacoes.length / ITENS_POR_PAGINA);
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const transacoesPaginadas = transacoes.slice(inicio, inicio + ITENS_POR_PAGINA);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pt-BR');

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...transacoes.map(t => [
        formatDate(t.data),
        `"${t.descricao}"`,
        t.categoria,
        t.tipo,
        t.valor.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Últimas Transações</h3>
        <button
          onClick={handleExportCSV}
          disabled={transacoes.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>
      
      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Data</th>
              <th className="px-6 py-4 font-semibold">Descrição</th>
              <th className="px-6 py-4 font-semibold">Categoria</th>
              <th className="px-6 py-4 font-semibold">Tipo</th>
              <th className="px-6 py-4 font-semibold text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transacoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma transação encontrada no período.
                </td>
              </tr>
            ) : (
              transacoesPaginadas.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {formatDate(t.data)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                    {t.descricao}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {t.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {t.tipo === 'receita' ? (
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        <ArrowUpCircle size={16} className="mr-1.5" />
                        Receita
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 dark:text-red-400">
                        <ArrowDownCircle size={16} className="mr-1.5" />
                        Despesa
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${
                    t.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {t.tipo === 'despesa' ? '-' : '+'}{formatCurrency(t.valor)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Página <span className="font-medium text-gray-900 dark:text-white">{pagina}</span> de <span className="font-medium text-gray-900 dark:text-white">{totalPaginas}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
