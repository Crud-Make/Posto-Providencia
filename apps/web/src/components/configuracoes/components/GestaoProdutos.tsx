// [10/01 17:46] Criado durante refatoração Issue #16
import React from 'react';
import { Fuel, Plus, Edit2, Trash2 } from 'lucide-react';
import { GestaoProdutosProps } from '../types';

/**
 * Componente para gestão de produtos (combustíveis).
 * Exibe lista de produtos e permite adicionar/editar/remover.
 * 
 * @param {GestaoProdutosProps} props - Props do componente
 * @returns {JSX.Element} Componente renderizado
 */
export const GestaoProdutos: React.FC<GestaoProdutosProps> = ({ products }) => {
    
    const getProductTypeStyle = (type: string) => {
        switch (type) {
            case "Combustível":
                return "bg-yellow-100 text-yellow-700";
            case "Biocombustível":
                return "bg-green-100 text-green-700";
            case "Diesel":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Fuel className="text-blue-600 dark:text-blue-500" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Gestão de Produtos
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Cadastre combustíveis e produtos da pista.
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                    <Plus size={14} /> ADICIONAR
                </button>
            </div>
            <div className="overflow-x-auto">
                {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum produto cadastrado.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Nome do Produto</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">
                                    Valor / Litro (R$)
                                </th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {products.map((product) => (
                                <tr
                                    key={product.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                        {product.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold ${getProductTypeStyle(product.type)}`}
                                        >
                                            {product.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-gray-100 font-bold">
                                        {product.price.toLocaleString("pt-BR", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                                            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
