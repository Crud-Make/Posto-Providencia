import React from 'react';
import { Search, ChevronRight, User } from 'lucide-react';
import { ClientesListaProps } from '../types';

/**
 * Componente de listagem de clientes.
 * Exibe lista com busca, saldo devedor e indicador de bloqueio.
 */
export const ClientesLista: React.FC<ClientesListaProps> = ({
    clientes,
    loading,
    searchTerm,
    selectedClienteId,
    onSearchChange,
    onClienteClick
}) => {
    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.documento?.includes(searchTerm)
    );

    return (
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredClientes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nenhum cliente encontrado
                    </div>
                ) : (
                    filteredClientes.map((cliente) => (
                        <div
                            key={cliente.id}
                            onClick={() => onClienteClick(cliente)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                selectedClienteId === cliente.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                        selectedClienteId === cliente.id
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {cliente.nome.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold text-sm ${
                                            selectedClienteId === cliente.id
                                                ? 'text-blue-900 dark:text-blue-100'
                                                : 'text-gray-900 dark:text-white'
                                        }`}>
                                            {cliente.nome}
                                        </h3>
                                        {cliente.documento && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{cliente.documento}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    {cliente.saldo_devedor > 0 && (
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap mb-1">
                                            {cliente.saldo_devedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    )}
                                    <ChevronRight size={16} className={`text-gray-400 ${selectedClienteId === cliente.id ? 'text-blue-500' : ''}`} />
                                </div>
                            </div>
                            {cliente.bloqueado && (
                                <div className="ml-13 pl-0.5">
                                    <div className="text-[10px] font-bold text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded border border-red-100">
                                        BLOQUEADO
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
