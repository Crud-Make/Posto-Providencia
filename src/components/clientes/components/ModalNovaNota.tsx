import React from 'react';
import { X, Save, CheckCircle, Loader2 } from 'lucide-react';
import { ModalNotaProps } from '../types';

/**
 * Modal para criar nova nota de fiado.
 * Permite marcar como já paga e selecionar frentista.
 */
export const ModalNovaNota: React.FC<ModalNotaProps> = ({
    isOpen,
    formData,
    frentistas,
    onClose,
    onSave,
    onChange,
    saving
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Nova Nota de Fiado
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    value={formData.valor}
                                    onChange={(e) => onChange('valor', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-lg"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                            <input
                                type="date"
                                value={formData.data}
                                onChange={(e) => onChange('data', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frentista *</label>
                        <select
                            value={formData.frentista_id}
                            onChange={(e) => onChange('frentista_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                            <option value="">Selecione um frentista...</option>
                            {frentistas.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                        <input
                            type="text"
                            value={formData.descricao}
                            onChange={(e) => onChange('descricao', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            placeholder="Ex: Abastecimento Placa ABC-1234"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={formData.jaPaga}
                                onChange={(e) => onChange('jaPaga', e.target.checked)}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar como Já Paga</span>
                        </label>

                        {formData.jaPaga && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                <div>
                                    <label className="block text-xs font-medium text-green-800 dark:text-green-200 mb-1">Data Pagamento</label>
                                    <input
                                        type="date"
                                        value={formData.dataPagamento}
                                        onChange={(e) => onChange('dataPagamento', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-green-200 dark:border-green-700 rounded focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-green-800 dark:text-green-200 mb-1">Forma Pagamento</label>
                                    <select
                                        value={formData.formaPagamento}
                                        onChange={(e) => onChange('formaPagamento', e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-green-200 dark:border-green-700 rounded focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        <option value="DINHEIRO">Dinheiro</option>
                                        <option value="PIX">PIX</option>
                                        <option value="CARTAO_DEBITO">Débito</option>
                                        <option value="CARTAO_CREDITO">Crédito</option>
                                    </select>
                                </div>
                            </div>
                        )}
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
                        onClick={onSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Salvar Nota
                    </button>
                </div>
            </div>
        </div>
    );
};
