// [10/01 17:46] Criado durante refatoração Issue #16
import React from 'react';
import { Sliders, Plus, Edit2, Trash2 } from 'lucide-react';
import { GestaoFormasPagamentoProps } from '../types';
import { formaPagamentoService } from '../../../services/api';

/**
 * Componente para gestão de formas de pagamento.
 * Exibe lista de formas de pagamento e modal de criação/edição.
 * 
 * @param {GestaoFormasPagamentoProps} props - Props do componente
 * @returns {JSX.Element} Componente renderizado
 */
export const GestaoFormasPagamento: React.FC<GestaoFormasPagamentoProps> = ({ 
    paymentMethods, 
    onAdd, 
    onEdit, 
    modal 
}) => {
    
    // Deconstruct modal props
    const { 
        isOpen, 
        editingPayment, 
        formData, 
        onClose, 
        onSave, 
        onChange 
    } = modal;

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Formas de Pagamento
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Taxas e prazos para o fluxo de caixa.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                    >
                        <Plus size={14} /> ADICIONAR
                    </button>
                </div>
                <div className="overflow-x-auto">
                    {paymentMethods.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            Nenhuma forma de pagamento configurada.
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4 text-right">Taxa (%)</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paymentMethods.map((method) => (
                                    <tr
                                        key={method.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            {method.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {method.type === "cartao_credito"
                                                    ? "Crédito"
                                                    : method.type === "cartao_debito"
                                                        ? "Débito"
                                                        : method.type === "pix"
                                                            ? "PIX"
                                                            : method.type === "dinheiro"
                                                                ? "Dinheiro"
                                                                : "Outros"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-gray-100 font-bold">
                                            {method.tax.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${method.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                                            >
                                                {method.active ? "Ativo" : "Inativo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                                                <button
                                                    onClick={() => onEdit(method)}
                                                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    onClick={() => {
                                                        if (window.confirm("Deseja realmente excluir?")) {
                                                            formaPagamentoService
                                                                .delete(Number(method.id))
                                                                .then(() => {
                                                                    window.location.reload(); 
                                                                });
                                                        }
                                                    }}
                                                >
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

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4 space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPayment
                                    ? "Editar Forma de Pagamento"
                                    : "Nova Forma de Pagamento"}
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => onChange("name", e.target.value)}
                                    placeholder="Ex: Cartão Visa Crédito"
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => onChange("type", e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="cartao_credito">Cartão de Crédito</option>
                                    <option value="cartao_debito">Cartão de Débito</option>
                                    <option value="pix">PIX</option>
                                    <option value="outros">Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    Taxa (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.tax}
                                        onChange={(e) => onChange("tax", parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                                        %
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Percentual descontado do valor bruto.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activeCheck"
                                    checked={formData.active}
                                    onChange={(e) => onChange("active", e.target.checked)}
                                    className="size-4 rounded text-green-600 focus:ring-green-500"
                                />
                                <label
                                    htmlFor="activeCheck"
                                    className="text-sm text-gray-700 dark:text-gray-300 font-medium"
                                >
                                    Ativo
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onSave}
                                className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
