import React from 'react';
import { Building2 } from 'lucide-react';
import { usePosto } from '../contexts/PostoContext';

// ============================================
// POSTO SELECTOR COMPONENT
// ============================================

/**
 * Componente de exibição de posto para o Header
 * Modo posto único: apenas mostra o nome do posto ativo
 */
const PostoSelector: React.FC = () => {
    const { postoAtivo, loading } = usePosto();
    // Modo posto único: sem dropdown, apenas exibição

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
        );
    }

    if (!postoAtivo) {
        return null;
    }

    // Modo posto único: apenas exibe o nome sem dropdown
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-900 dark:text-white text-sm">
                {postoAtivo.nome}
            </span>
        </div>
    );
};

export default PostoSelector;
