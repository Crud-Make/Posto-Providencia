import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { CATEGORIAS_DESPESA } from '../types';

interface FiltrosDespesasProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string;
    onCategoryChange: (value: string) => void;
    onNewExpense: () => void;
}

const FiltrosDespesas: React.FC<FiltrosDespesasProps> = ({
    searchTerm,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    onNewExpense
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar despesas..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
            </div>
            <div className="flex gap-2">
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
                    >
                        <option value="all">Todas as Categorias</option>
                        {CATEGORIAS_DESPESA.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={onNewExpense}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Nova Despesa</span>
                </button>
            </div>
        </div>
    );
};

export default FiltrosDespesas;
