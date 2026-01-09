
import React from 'react';
import { Eye, Edit2 } from 'lucide-react';
import { AttendantClosing } from '../types/index';

interface ClosingsTableProps {
  data: AttendantClosing[];
}

const ClosingsTable: React.FC<ClosingsTableProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fechamentos do Dia</h2>
        <button className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">Ver todos</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Frentista</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold">Venda Total</th>
              <th className="px-6 py-4 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(!data || data.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm italic">
                  Nenhum fechamento registrado hoje.
                </td>
              </tr>
            ) : (
              data.map((closing) => (
                <tr key={closing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={closing.avatar} alt={closing.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                      <span className="font-medium text-gray-900 dark:text-white">{closing.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${closing.status === 'OK' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : ''}
                        ${closing.status === 'Divergente' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : ''}
                        ${closing.status === 'Aberto' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' : ''}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5
                            ${closing.status === 'OK' ? 'bg-green-500' : ''}
                            ${closing.status === 'Divergente' ? 'bg-red-500' : ''}
                            ${closing.status === 'Aberto' ? 'bg-yellow-500' : ''}
                        `}></span>
                      {closing.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    R$ {closing.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {closing.status === 'Aberto' ? (
                      <button className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={18} />
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClosingsTable;
