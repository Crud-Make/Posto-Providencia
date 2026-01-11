import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { ModalPagamentoProps } from '../types';

/**
 * Modal para registrar pagamento de nota.
 * Permite escolher data, forma de pagamento e observações.
 */
export const ModalPagamento: React.FC<ModalPagamentoProps> = ({
    isOpen,
    formData,
    onClose,
    onConfirm,
    onChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-100 flex items-center gap-2">
                        <CheckCircle size={20} />
                        Confirmar Pagamento
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Deseja confirmar o pagamento desta nota? Esta ação irá baixar o débito do cliente.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Pagamento</label>
                        <input
                            type="date"
                            value={formData.data}
                            onChange={(e) => onChange('data', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pagamento</label>
                        <select
                            value={formData.formaPagamento}
                            onChange={(e) => onChange('formaPagamento', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">PIX</option>
                            <option value="CARTAO_DEBITO">Débito</option>
                            <option value="CARTAO_CREDITO">Crédito</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                        <input
                            type="text"
                            value={formData.observacoes}
                            onChange={(e) => onChange('observacoes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        <CheckCircle size={18} />
                        Confirmar Baixa
                    </button>
                </div>
            </div>
        </div>
    );
};
