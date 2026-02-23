import { useState, useEffect, useCallback } from 'react';
import { despesaService } from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';
import { usePosto } from '../../../contexts/PostoContext';
import { Despesa, DespesaFormData } from '../types';
import { toast } from 'sonner';

export const useDespesas = () => {
    const { postoAtivoId } = usePosto();
    const [expenses, setExpenses] = useState<Despesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const loadData = useCallback(async () => {
        if (!postoAtivoId) return;
        setLoading(true);
        try {
            const res = await despesaService.getAll(postoAtivoId);
            if (!isSuccess(res)) return;
            setExpenses(res.data.map(d => ({
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
            toast.error("Erro ao carregar despesas.");
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const saveExpense = async (formData: DespesaFormData, id?: string) => {
        try {
            const payload = {
                ...formData,
                posto_id: postoAtivoId || formData.posto_id
            };

            if (id) {
                await despesaService.update(Number(id), payload);
                toast.success('Despesa atualizada com sucesso!');
            } else {
                await despesaService.create(payload);
                toast.success('Despesa cadastrada com sucesso!');
            }
            loadData();
            return true;
        } catch (error) {
            console.error("Failed to save expense", error);
            toast.error("Erro ao salvar despesa.");
            return false;
        }
    };

    const deleteExpense = async (id: string) => {
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

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.categoria.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || e.categoria === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Stats
    const totalPending = expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + e.valor, 0);
    const totalPaidThisMonth = expenses.filter(e => {
        const d = new Date(e.data);
        const now = new Date();
        return e.status === 'pago' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.valor, 0);

    return {
        expenses,
        filteredExpenses,
        loading,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        loadData,
        saveExpense,
        deleteExpense,
        toggleStatus,
        stats: {
            totalPending,
            totalPaidThisMonth,
            countPending: expenses.filter(e => e.status === 'pendente').length
        }
    };
};
