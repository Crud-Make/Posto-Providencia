import React from 'react';
import { Trash2, Plus, User } from 'lucide-react';
import { SessaoFrentista } from '../../types/fechamento';
import { Frentista } from '../../services/database.types';
import { paraReais } from '../../utils/formatters';

interface SecaoSessoesFrentistasProps {
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  onSessaoChange: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onSessaoBlur: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onRemoverSessao: (tempId: string) => void;
  onAdicionarSessao: () => void;
  isLoading?: boolean;
}

export const SecaoSessoesFrentistas: React.FC<SecaoSessoesFrentistasProps> = ({
  sessoes,
  frentistas,
  onSessaoChange,
  onSessaoBlur,
  onRemoverSessao,
  onAdicionarSessao,
  isLoading
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>👤</span> Sessões de Frentistas
        </h2>
        <button
          onClick={onAdicionarSessao}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Adicionar Frentista
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Frentista</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Dinheiro</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Cartão</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">PIX</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Nota/Vale</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Baratão</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessoes.map((sessao) => (
              <tr key={sessao.tempId} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <select
                    value={sessao.frentistaId || ''}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'frentistaId', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                  >
                    <option value="">Selecione...</option>
                    {frentistas.filter(f => f.ativo).map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sessao.valor_dinheiro}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'valor_dinheiro', e.target.value)}
                    onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_dinheiro', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                    placeholder="R$ 0,00"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sessao.valor_cartao}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'valor_cartao', e.target.value)}
                    onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_cartao', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                    placeholder="R$ 0,00"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sessao.valor_pix}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'valor_pix', e.target.value)}
                    onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_pix', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                    placeholder="R$ 0,00"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sessao.valor_nota}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'valor_nota', e.target.value)}
                    onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_nota', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                    placeholder="R$ 0,00"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sessao.valor_baratao}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'valor_baratao', e.target.value)}
                    onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_baratao', e.target.value)}
                    disabled={isLoading}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                    placeholder="R$ 0,00"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => onRemoverSessao(sessao.tempId)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-900"
                    title="Remover"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sessoes.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhuma sessão iniciada. Clique em "Adicionar Frentista".
        </div>
      )}
    </div>
  );
};
