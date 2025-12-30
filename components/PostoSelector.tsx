import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, MapPin } from 'lucide-react';
import { usePosto } from '../contexts/PostoContext';

// ============================================
// POSTO SELECTOR COMPONENT
// ============================================

/**
 * Componente de seleção de posto para o Header
 * Permite trocar entre os postos disponíveis
 */
const PostoSelector: React.FC = () => {
    const { postos, postoAtivo, setPostoAtivo, loading } = usePosto();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fechar dropdown ao pressionar ESC
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botão principal */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 py-2 
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-sm
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-200
          ${isOpen ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {postoAtivo.nome}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="
            absolute top-full left-0 mt-2 w-64
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            py-1 z-50
            animate-in fade-in slide-in-from-top-2 duration-200
          "
                    role="listbox"
                >
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Selecione o Posto
                        </p>
                    </div>

                    {postos.map((posto) => (
                        <button
                            key={posto.id}
                            onClick={() => {
                                setPostoAtivo(posto);
                                setIsOpen(false);
                            }}
                            className={`
                w-full flex items-center gap-3 px-3 py-3
                text-left
                hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors duration-150
                ${posto.id === postoAtivo.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
                            role="option"
                            aria-selected={posto.id === postoAtivo.id}
                        >
                            <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${posto.id === postoAtivo.id
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }
              `}>
                                <Building2
                                    className={`w-5 h-5 ${posto.id === postoAtivo.id
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={`
                  font-medium text-sm truncate
                  ${posto.id === postoAtivo.id
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : 'text-gray-900 dark:text-white'
                                    }
                `}>
                                    {posto.nome}
                                </p>
                                {posto.cidade && (
                                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        {posto.cidade}{posto.estado ? `, ${posto.estado}` : ''}
                                    </p>
                                )}
                            </div>

                            {posto.id === postoAtivo.id && (
                                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            )}
                        </button>
                    ))}

                    {postos.length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                            Nenhum posto disponível
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PostoSelector;
