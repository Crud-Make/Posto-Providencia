import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Calendar,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2,
    Edit,
    ChevronRight,
    ChevronLeft,
    CreditCard,
    Wallet,
    Percent,
    Check,
    X,
    Loader2,
    FileText,
    AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { usePosto } from '../contexts/PostoContext';
import { Loan, LoanInstallment } from '../types';
import KPICard from './KPICard';
import { toast } from 'sonner';

const TelaGestaoFinanceira: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewLoanModal, setShowNewLoanModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        credor: '',
        valor_total: 0,
        quantidade_parcelas: 1,
        valor_parcela: 0,
        data_emprestimo: new Date().toISOString().split('T')[0],
        data_primeiro_vencimento: '',
        periodicidade: 'mensal' as 'mensal' | 'quinzenal' | 'semanal' | 'diario',
        taxa_juros: 0,
        observacoes: '',
        posto_id: postoAtivoId || 1
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.emprestimo.getAll(postoAtivoId);
            setLoans(data.map(l => ({
                id: String(l.id),
                credor: l.credor,
                valorTotal: l.valor_total,
                quantidadeParcelas: l.quantidade_parcelas,
                valorParcela: l.valor_parcela,
                dataEmprestimo: l.data_emprestimo,
                dataPrimeiroVencimento: l.data_primeiro_vencimento,
                periodicidade: l.periodicidade,
                taxaJuros: l.taxa_juros || 0,
                observacoes: l.observacoes || '',
                ativo: l.ativo,
                parcelas: l.parcelas.map(p => ({
                    id: String(p.id),
                    emprestimoId: String(p.emprestimo_id),
                    numeroParcela: p.numero_parcela,
                    dataVencimento: p.data_vencimento,
                    valor: p.valor,
                    dataPagamento: p.data_pagamento,
                    status: p.status,
                    jurosMulta: p.juros_multa || 0
                }))
            })));
        } catch (error) {
            console.error("Failed to load loans", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [postoAtivoId]);

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editingLoanId) {
                await api.emprestimo.update(Number(editingLoanId), formData as any);
                toast.success("Empréstimo atualizado com sucesso!");
            } else {
                await api.emprestimo.create(formData as any);
                toast.success("Empréstimo criado com sucesso!");
            }
            setShowNewLoanModal(false);
            setIsEditing(false);
            setEditingLoanId(null);
            loadData();
            // Reset form
            setFormData({
                credor: '',
                valor_total: 0,
                quantidade_parcelas: 1,
                valor_parcela: 0,
                data_emprestimo: new Date().toISOString().split('T')[0],
                data_primeiro_vencimento: '',
                periodicidade: 'mensal',
                taxa_juros: 0,
                observacoes: '',
                posto_id: postoAtivoId || 1
            });
        } catch (error) {
            console.error("Failed to handle loan", error);
            toast.error("Erro ao processar empréstimo. Verifique sua conexão.");
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        if (!confirm("Tem certeza que deseja excluir este empréstimo e todas as suas parcelas?")) return;

        try {
            await api.emprestimo.delete(Number(loanId));
            toast.success("Empréstimo excluído com sucesso!");
            setSelectedLoan(null);
            loadData();
        } catch (error) {
            console.error("Failed to delete loan", error);
            toast.error("Erro ao excluir empréstimo.");
        }
    };

    const handleEditLoan = (loan: Loan) => {
        setIsEditing(true);
        setEditingLoanId(loan.id);
        setFormData({
            credor: loan.credor,
            valor_total: loan.valorTotal,
            quantidade_parcelas: loan.quantidadeParcelas,
            valor_parcela: loan.valorParcela,
            data_emprestimo: loan.dataEmprestimo,
            data_primeiro_vencimento: loan.dataPrimeiroVencimento,
            periodicidade: loan.periodicidade as any,
            taxa_juros: loan.taxaJuros,
            observacoes: loan.observacoes,
            posto_id: postoAtivoId || 1
        });
        setShowNewLoanModal(true);
    };

    const handlePayInstallment = async (installmentId: string, status: 'pago' | 'pendente') => {
        try {
            await api.parcela.update(Number(installmentId), {
                status,
                data_pagamento: status === 'pago' ? new Date().toISOString().split('T')[0] : null
            });
            loadData();
        } catch (error) {
            console.error("Failed to update installment", error);
        }
    };

    // Stats
    const totalDebt = loans.reduce((acc, l) => {
        const unpaid = l.parcelas?.filter(p => p.status !== 'pago').reduce((sum, p) => sum + p.valor, 0) || 0;
        return acc + unpaid;
    }, 0);

    const monthlyInstallments = loans.reduce((acc, l) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const sum = l.parcelas?.filter(p => {
            const d = new Date(p.dataVencimento);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.status !== 'pago';
        }).reduce((s, p) => s + p.valor, 0) || 0;
        return acc + sum;
    }, 0);

    const nextVencimento = loans.length > 0 ?
        loans.flatMap(l => l.parcelas || [])
            .filter(p => p.status !== 'pago')
            .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0]?.dataVencimento
        : 'N/A';

    if (loading && loans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] w-full text-red-600">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Carregando dados financeiros...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão Financeira</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie empréstimos, parcelas e compromissos futuros do posto.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowNewLoanModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold hover:bg-red-800 transition-all shadow-lg shadow-red-900/20 active:scale-95"
                    >
                        <Plus size={18} />
                        Novo Empréstimo
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Saldo Devedor Total</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">R$ {totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-medium">Total de compromissos ativos:</span>
                        <span className="text-red-600 dark:text-red-400 font-bold">{loans.filter(l => l.ativo).length}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Parcelas do Mês</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">R$ {monthlyInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-medium">Próximo vencimento:</span>
                        <span className="text-orange-600 dark:text-orange-400 font-black">{nextVencimento !== 'N/A' ? new Date(nextVencimento).toLocaleDateString('pt-BR') : 'Nenhuma'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Parcelas Quitadas</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                {loans.flatMap(l => l.parcelas || []).filter(p => p.status === 'pago').length}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-medium">Taxa de liquidação:</span>
                        <span className="text-green-600 dark:text-green-400 font-bold">
                            {loans.flatMap(l => l.parcelas || []).length > 0
                                ? Math.round((loans.flatMap(l => l.parcelas || []).filter(p => p.status === 'pago').length / loans.flatMap(l => l.parcelas || []).length) * 100)
                                : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Loans List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Loan Cards */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Empréstimos Ativos</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar credor..."
                                className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all w-48 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {loans.length === 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl p-12 text-center">
                            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-500 mb-4" />
                            <h3 className="text-gray-900 dark:text-white font-bold">Nenhum empréstimo registrado</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Comece clicando no botão "Novo Empréstimo".</p>
                        </div>
                    ) : (
                        loans.map(loan => (
                            <div
                                key={loan.id}
                                onClick={() => setSelectedLoan(loan)}
                                className={`group relative bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedLoan?.id === loan.id ? 'border-red-600 shadow-lg ring-1 ring-red-600/10' : 'border-gray-50 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${selectedLoan?.id === loan.id ? 'bg-red-600 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400'}`}>
                                            <ArrowUpRight size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white leading-none">{loan.credor}</h4>
                                            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                                <Calendar size={12} /> {new Date(loan.dataEmprestimo).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900 dark:text-white">R$ {loan.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{loan.quantidadeParcelas}x de R$ {loan.valorParcela.toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>

                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-3">
                                    <div
                                        className="bg-red-600 h-full transition-all duration-700"
                                        style={{ width: `${(loan.parcelas?.filter(p => p.status === 'pago').length || 0) / (loan.quantidadeParcelas || 1) * 100}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{loan.parcelas?.filter(p => p.status === 'pago').length}/{loan.quantidadeParcelas} parcelas pagas</span>
                                    <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-md">
                                        <div className="size-1.5 rounded-full bg-red-600 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">{loan.periodicidade}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Side: Installment Details */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 overflow-hidden min-h-[500px] flex flex-col">
                    {selectedLoan ? (
                        <>
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{selectedLoan.credor}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                        Detalhamento das parcelas e pagamentos.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditLoan(selectedLoan)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLoan(selectedLoan.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-400 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 overflow-y-auto flex-1 pr-2 max-h-[600px]">
                                {selectedLoan.parcelas?.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${p.status === 'pago' ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100 dark:border-green-800/30 opacity-75' : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg font-bold text-sm ${p.status === 'pago' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}>
                                                {String(p.numeroParcela).padStart(2, '0')}
                                            </div>
                                            <div>
                                                <p className={`font-bold ${p.status === 'pago' ? 'text-green-800 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Calendar size={12} /> {new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
                                                    {p.status === 'pago' && <span className="ml-2 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-[10px] uppercase font-black tracking-tighter">Pago em {new Date(p.dataPagamento!).toLocaleDateString('pt-BR')}</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.status !== 'pago' ? (
                                                <button
                                                    onClick={() => handlePayInstallment(p.id, 'pago')}
                                                    className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all active:scale-95 shadow-sm"
                                                >
                                                    Pagar Parcela
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handlePayInstallment(p.id, 'pendente')}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                    title="Estornar pagamento"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Restante a pagar</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white">
                                            R$ {selectedLoan.parcelas?.filter(p => p.status !== 'pago').reduce((s, p) => s + p.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Taxas Acumuladas</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">R$ {(selectedLoan.taxaJuros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="size-20 bg-gray-50 dark:bg-gray-700 text-gray-300 dark:text-gray-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-gray-700/50">
                                <CreditCard size={40} />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Detalhes do Empréstimo</h3>
                            <p className="text-gray-400 text-sm mt-1 max-w-[200px]">Selecione um empréstimo ao lado para gerenciar as parcelas.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Loan Modal */}
            {showNewLoanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="px-8 py-6 bg-red-700 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Editar Empréstimo' : 'Novo Empréstimo'}</h2>
                                <p className="text-red-100 text-sm font-medium">
                                    {isEditing ? 'Atualize os dados básicos do compromisso.' : 'Preencha os dados para gerar o cronograma de parcelas.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowNewLoanModal(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLoan} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Credor / Instituição</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.credor}
                                        onChange={(e) => setFormData({ ...formData, credor: e.target.value })}
                                        placeholder="Ex: Banco do Brasil, Empréstimo Sócio..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Valor Total (Principal)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={formData.valor_total || ''}
                                            onChange={(e) => {
                                                const total = parseFloat(e.target.value) || 0;
                                                setFormData({
                                                    ...formData,
                                                    valor_total: total,
                                                    valor_parcela: total / formData.quantidade_parcelas
                                                });
                                            }}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Quantidade de Parcelas</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.quantidade_parcelas}
                                        onChange={(e) => {
                                            const qty = parseInt(e.target.value) || 1;
                                            setFormData({
                                                ...formData,
                                                quantidade_parcelas: qty,
                                                valor_parcela: formData.valor_total / qty
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Valor da Parcela (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={formData.valor_parcela || ''}
                                        onChange={(e) => setFormData({ ...formData, valor_parcela: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl font-bold text-gray-900"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Calculado automaticamente</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Data 1º Vencimento</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.data_primeiro_vencimento}
                                        onChange={(e) => setFormData({ ...formData, data_primeiro_vencimento: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Periodicidade</label>
                                    <select
                                        value={formData.periodicidade}
                                        onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                    >
                                        <option value="mensal">Mensal</option>
                                        <option value="quinzenal">Quinzenal</option>
                                        <option value="semanal">Semanal</option>
                                        <option value="diario">Diário</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Taxa de Juros (opcional)</label>
                                    <div className="relative">
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.taxa_juros || ''}
                                            onChange={(e) => setFormData({ ...formData, taxa_juros: parseFloat(e.target.value) || 0 })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNewLoanModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-red-700 text-white rounded-2xl font-black text-sm hover:bg-red-800 transition-all shadow-xl shadow-red-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    SALVAR E GERAR PARCELAS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sticky Footer Message */}
            <div className="mt-12 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-4">
                <div className="p-2 bg-white rounded-xl text-red-600 shadow-sm">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h4 className="text-red-900 font-black tracking-tight">Importante: Conciliação Bancária</h4>
                    <p className="text-red-700/80 text-sm mt-1 leading-relaxed">
                        Os pagamentos realizados aqui atualizam o saldo devedor do sistema, mas não substituem o extrato bancário.
                        Certifique-se de conferir se as saídas de caixa foram registradas corretamente nos relatórios diários.
                    </p>
                </div>
            </div>

        </div>
    );
};

export default TelaGestaoFinanceira;
