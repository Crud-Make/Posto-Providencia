// [13/01 10:15] Adicionado JSDoc para conformidade com Regra 5/Qualidade
/**
 * Componente FormDespesa
 *
 * Modal para criação e edição de despesas.
 * Permite preencher detalhes como descrição, valor, data, categoria e status de pagamento.
 *
 * @module FormDespesa
 */
import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, Calendar, Tag, FileText, AlertCircle } from 'lucide-react';
import { Despesa, DespesaFormData, CATEGORIAS_DESPESA } from '../types';

/**
 * Propriedades do componente FormDespesa.
 */
interface FormDespesaProps {
    /** Dados iniciais para edição (opcional) */
    initialData?: Despesa | null;
    /** ID do posto associado à despesa */
    postoId: number;
    /** Função de callback ao salvar a despesa */
    onSave: (data: DespesaFormData, id?: string) => Promise<boolean>;
    /** Função de callback ao cancelar/fechar o modal */
    onCancel: () => void;
}

/**
 * Formulário modal para gerenciar despesas.
 *
 * Gerencia o estado interno do formulário e validações básicas.
 * Suporta modos de criação e edição baseados na prop `initialData`.
 *
 * @component
 * @param {FormDespesaProps} props - Propriedades do componente.
 * @returns {JSX.Element} O modal com o formulário de despesa.
 */
const FormDespesa: React.FC<FormDespesaProps> = ({
    initialData,
    postoId,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState<DespesaFormData>({
        descricao: '',
        categoria: 'Outros',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        status: 'pendente',
        data_pagamento: null,
        observacoes: '',
        posto_id: postoId
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                descricao: initialData.descricao,
                categoria: initialData.categoria || 'Outros',
                valor: initialData.valor,
                data: initialData.data,
                status: initialData.status,
                data_pagamento: initialData.data_pagamento || null,
                observacoes: initialData.observacoes || '',
                posto_id: initialData.posto_id
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const success = await onSave(formData, initialData?.id);
            if (success) {
                onCancel();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        {initialData ? 'Editar Despesa' : 'Nova Despesa'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Descrição *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Conta de Luz"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Valor *</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.valor}
                                    onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Data *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.data}
                                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Categoria</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    {CATEGORIAS_DESPESA.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                            <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'pendente', data_pagamento: null })}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formData.status === 'pendente'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Pendente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formData.status === 'pago'
                                        ? 'bg-green-500 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Pago
                                </button>
                            </div>
                        </div>
                    </div>

                    {formData.status === 'pago' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Data Pagamento</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    value={formData.data_pagamento || ''}
                                    onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Observações</label>
                        <textarea
                            rows={3}
                            value={formData.observacoes}
                            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Detalhes adicionais..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FormDespesa;
