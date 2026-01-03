import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Calendar,
    DollarSign,
    Filter,
    MoreVertical,
    Trash2,
    Edit,
    CheckCircle2,
    Clock,
    Tag,
    FileText,
    Download,
    Loader2,
    X,
    AlertTriangle,
    CreditCard
} from 'lucide-react';
import { despesaService } from '../services/api';
import { usePosto } from '../contexts/PostoContext';
import { Despesa } from '../types';
import { toast } from 'sonner';
import KPICard from './KPICard';

const categories = [
    'Aluguel',
    'Energia Elétrica',
    'Água e Saneamento',
    'Internet/Telefone',
    'Folha de Pagamento',
    'Encargos Sociais',
    'Manutenção',
    'Limpeza',
    'Impostos',
    'Marketing',
    'Seguros',
    'Contabilidade',
    'Outros'
];

const ExpenseManagementScreen: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [expenses, setExpenses] = useState<Despesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        descricao: '',
        categoria: 'Outros',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        status: 'pendente' as 'pendente' | 'pago',
        data_pagamento: null as string | null,
        observacoes: '',
        posto_id: postoAtivoId || 1
    });

    const loadData = async () => {
        if (!postoAtivoId) return;
        setLoading(true);
        try {
            const data = await despesaService.getAll(postoAtivoId);
            setExpenses(data.map(d => ({
                id: String(d.id),
                descricao: d.descricao,
                categoria: d.categoria || 'Outros',
                valor: Number(d.valor),
                data: d.data,
                status: d.status,
                posto_id: d.posto_id,
                data_pagamento: d.data_pagamento,
                observacoes: d.observacoes || ''
            })));
        } catch (error) {
            console.error("Failed to load expenses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [postoAtivoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                posto_id: postoAtivoId
            };

            if (editingExpense) {
                await despesaService.update(Number(editingExpense.id), payload);
                toast.success('Despesa atualizada com sucesso!');
            } else {
                await despesaService.create(payload);
                toast.success('Despesa cadastrada com sucesso!');
            }

            setShowModal(false);
            setEditingExpense(null);
            loadData();
            // Reset form
            setFormData({
                descricao: '',
                categoria: 'Outros',
                valor: 0,
                data: new Date().toISOString().split('T')[0],
                status: 'pendente',
                data_pagamento: null,
                observacoes: '',
                posto_id: postoAtivoId || 1
            });
        } catch (error) {
            console.error("Failed to save expense", error);
            toast.error("Erro ao salvar despesa.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta despesa?')) return;
        try {
            await despesaService.delete(Number(id));
            toast.success('Despesa excluída com sucesso!');
            loadData();
        } catch (error) {
            console.error("Failed to delete expense", error);
            toast.error('Erro ao excluir despesa.');
        }
    };

    const handleEdit = (expense: Despesa) => {
        setEditingExpense(expense);
        setFormData({
            descricao: expense.descricao,
            categoria: expense.categoria,
            valor: expense.valor,
            data: expense.data,
            status: expense.status,
            data_pagamento: expense.data_pagamento || null,
            observacoes: expense.observacoes || '',
            posto_id: expense.posto_id
        });
        setShowModal(true);
    };

    const toggleStatus = async (expense: Despesa) => {
        const newStatus = expense.status === 'pendente' ? 'pago' : 'pendente';
        const newDataPagamento = newStatus === 'pago' ? new Date().toISOString().split('T')[0] : null;

        try {
            await despesaService.update(Number(expense.id), {
                status: newStatus,
                data_pagamento: newDataPagamento
            });
            loadData();
            toast.success(`Despesa marcada como ${newStatus}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error('Erro ao atualizar status.');
        }
    };

    // Stats
    const totalPending = expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + e.valor, 0);
    const totalPaidThisMonth = expenses.filter(e => {
        const d = new Date(e.data);
        const now = new Date();
        return e.status === 'pago' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.valor, 0);

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.categoria.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || e.categoria === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const fmtMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                        Gestão de Despesas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Controle seus custos fixos e variáveis.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            // Implementação futura: Pagar despesas selecionadas ou abrir modal de pagamento em massa
                            toast.info('Selecione as despesas que deseja pagar (Funcionalidade em desenvolvimento)');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-green-500/20 transition-all active:scale-95"
                    >
                        <CreditCard size={20} />
                        Pagar
                    </button>
                    <button
                        onClick={() => {
                            setEditingExpense(null);
                            setFormData({
                                descricao: '',
                                categoria: 'Outros',
                                valor: 0,
                                data: new Date().toISOString().split('T')[0],
                                status: 'pendente',
                                data_pagamento: null,
                                observacoes: '',
                                posto_id: postoAtivoId || 1
                            });
                            setShowModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Nova Despesa
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KPICard
                    title="Total Pendente"
                    value={fmtMoney(totalPending)}
                    trendValue={expenses.filter(e => e.status === 'pendente').length.toString()}
                    trendLabel="despesas pendentes"
                    isNegativeTrend={totalPending > 0}
                    Icon={Clock}
                    iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                    iconColor="text-orange-600 dark:text-orange-400"
                />
                <KPICard
                    title="Pago este Mês"
                    value={fmtMoney(totalPaidThisMonth)}
                    trendValue="R$"
                    trendLabel="pago no mês atual"
                    Icon={CheckCircle2}
                    iconBgColor="bg-green-50 dark:bg-green-900/20"
                    iconColor="text-green-600 dark:text-green-400"
                />
            </div>

            {/* List and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por descrição ou categoria..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Filter size={16} className="text-gray-400" />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-transparent text-sm font-medium border-none outline-none text-gray-700 dark:text-gray-200"
                                >
                                    <option value="all">Todas Categorias</option>
                                    {categories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                            <p className="text-gray-500">Carregando despesas...</p>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <FileText size={64} className="opacity-10 mb-4" />
                            <p className="text-lg font-medium">Nenhuma despesa encontrada</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                    {new Date(expense.data).toLocaleDateString('pt-BR')}
                                                </span>
                                                {expense.data_pagamento && (
                                                    <span className="text-[10px] text-green-500 font-medium">
                                                        Pago em {new Date(expense.data_pagamento).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">{expense.descricao}</span>
                                                {expense.observacoes && (
                                                    <span className="text-xs text-gray-500 truncate max-w-xs">{expense.observacoes}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                <Tag size={12} />
                                                {expense.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-gray-900 dark:text-gray-100">
                                                {fmtMoney(expense.valor)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(expense)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${expense.status === 'pago'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                {expense.status === 'pago' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
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
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Descrição *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    placeholder="Ex: Aluguel do mês"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Categoria *</label>
                                    <select
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    >
                                        {categories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={formData.valor}
                                        onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-mono"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Data Vencimento *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.data}
                                        onChange={e => setFormData({ ...formData, data: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as 'pendente' | 'pago' })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-bold"
                                    >
                                        <option value="pendente">🔴 Pendente</option>
                                        <option value="pago">🟢 Pago</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Observações</label>
                                <textarea
                                    rows={3}
                                    value={formData.observacoes}
                                    onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
                                    placeholder="Informações adicionais..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-4 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    {editingExpense ? 'Salvar Alterações' : 'Cadastrar Despesa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseManagementScreen;
