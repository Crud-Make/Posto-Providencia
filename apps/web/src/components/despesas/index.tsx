import React, { useState } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { useDespesas } from './hooks/useDespesas';
import { Despesa } from './types';
import ResumoDespesas from './components/ResumoDespesas';
import FiltrosDespesas from './components/FiltrosDespesas';
import TabelaDespesas from './components/TabelaDespesas';
import FormDespesa from './components/FormDespesa';

const TelaGestaoDespesas: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const {
        loading,
        filteredExpenses,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        stats,
        saveExpense,
        deleteExpense,
        toggleStatus
    } = useDespesas();

    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);

    const handleEdit = (expense: Despesa) => {
        setEditingExpense(expense);
        setShowModal(true);
    };

    const handleNew = () => {
        setEditingExpense(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingExpense(null);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    if (!postoAtivoId) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Selecione um posto para visualizar as despesas.
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Despesas</h1>
                <p className="text-gray-500 dark:text-gray-400">Gerencie as contas a pagar e despesas do posto</p>
            </div>

            <ResumoDespesas 
                stats={stats} 
                formatCurrency={formatCurrency} 
            />

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <FiltrosDespesas
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    onNewExpense={handleNew}
                />

                <TabelaDespesas
                    loading={loading}
                    expenses={filteredExpenses}
                    formatCurrency={formatCurrency}
                    onToggleStatus={toggleStatus}
                    onEdit={handleEdit}
                    onDelete={deleteExpense}
                />
            </div>

            {showModal && (
                <FormDespesa
                    initialData={editingExpense}
                    postoId={postoAtivoId}
                    onSave={saveExpense}
                    onCancel={handleCloseModal}
                />
            )}
        </div>
    );
};

export default TelaGestaoDespesas;
