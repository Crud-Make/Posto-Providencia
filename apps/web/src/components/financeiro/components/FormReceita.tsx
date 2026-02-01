import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
// [01/02 11:30] Criado formulário de receitas extras com suporte a categorias dinâmicas.
import { categoriaService, CategoriaFinanceira } from '../../../services/api/categoria.service';

/**
 * Interface para os dados do formulário de receita.
 */
export interface ReceitaFormData {
    descricao: string;
    valor: number;
    data: string;
    categoria_id: number | null;
    status: 'recebido' | 'pendente';
    observacoes: string;
    posto_id: number;
}

/**
 * Propriedades do componente FormReceita.
 */
interface FormReceitaProps {
    postoId: number;
    onSave: (data: ReceitaFormData) => Promise<boolean>;
    onCancel: () => void;
}

/**
 * Formulário modal para gerenciar receitas extras.
 *
 * @component
 */
export const FormReceita: React.FC<FormReceitaProps> = ({
    postoId,
    onSave,
    onCancel
}) => {
    const [formData, setFormData] = useState<ReceitaFormData>({
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        categoria_id: null,
        status: 'recebido',
        observacoes: '',
        posto_id: postoId
    });

    const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingCats, setLoadingCats] = useState(true);

    useEffect(() => {
        const loadCats = async () => {
            setLoadingCats(true);
            const res = await categoriaService.getAll(postoId, 'receita');
            if (res.success) {
                setCategorias(res.data || []);
                if (res.data && res.data.length > 0) {
                    setFormData(prev => ({ ...prev, categoria_id: res.data![0].id }));
                }
            }
            setLoadingCats(false);
        };
        loadCats();
    }, [postoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const success = await onSave(formData);
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
                        Nova Receita Extra
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
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Ex: Aluguel de Loja"
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
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                                    value={formData.categoria_id || ''}
                                    onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none disabled:opacity-50"
                                    disabled={loadingCats}
                                >
                                    <option value="">Selecione...</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                            <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'pendente' })}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formData.status === 'pendente'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    A receber
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'recebido' })}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formData.status === 'recebido'
                                        ? 'bg-green-500 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Recebido
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Observações</label>
                        <textarea
                            rows={3}
                            value={formData.observacoes}
                            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
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
                            className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
