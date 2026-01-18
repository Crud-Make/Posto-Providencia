import React from 'react';
import { Package, AlertTriangle, ArrowUpCircle, Edit2, Loader2 } from 'lucide-react';
import { Produto } from '../types';
import { formatarMoeda } from '../../../../utils/formatters';

interface TabelaEstoqueProps {
  loading: boolean;
  products: Produto[];
  onMovement: (product: Produto) => void;
  onEdit: (product: Produto) => void;
}

const TabelaEstoque: React.FC<TabelaEstoqueProps> = ({
  loading,
  products,
  onMovement,
  onEdit
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400">
          <Package size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-center">Estoque</th>
                <th className="px-6 py-4 text-right">Preço Venda</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-gray-900">{product.nome}</p>
                      <p className="text-xs text-gray-500">{product.codigo_barras || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {product.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold text-base ${product.estoque_atual <= product.estoque_minimo ? 'text-red-600' : 'text-gray-900'
                        }`}>
                        {product.estoque_atual} {product.unidade_medida}
                      </span>
                      {product.estoque_atual <= product.estoque_minimo && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={10} /> Baixo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatarMoeda(product.preco_venda)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onMovement(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                        title="Movimentar Estoque"
                      >
                        <ArrowUpCircle size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabelaEstoque;
