import React from 'react';
import { Ban, Edit, Trash2, Plus, Phone, FileText } from 'lucide-react';
import { ClienteDetalhesProps } from '../types';
import { NotasLista } from './NotasLista';

/**
 * Componente de detalhes do cliente.
 * Exibe informações, saldo e ações (nova nota, editar, bloquear, apagar).
 */
export const ClienteDetalhes: React.FC<ClienteDetalhesProps> = ({
    cliente,
    notas,
    loadingNotas,
    onNovaNota,
    onEditarCliente,
    onBloquear,
    onApagar,
    onPagamento
}) => {
    if (!cliente) {
        return (
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center h-[600px] text-gray-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Selecione um cliente para ver detalhes e lançar notas</p>
            </div>
        );
    }

    return (
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[600px]">
            {/* Header do Cliente */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                {/* Alerta de Bloqueio */}
                {cliente.bloqueado && (
                    <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between text-red-800 dark:text-red-200">
                        <div className="flex items-center gap-2">
                            <Ban size={20} />
                            <div>
                                <p className="font-bold text-sm">Cliente Bloqueado</p>
                                <p className="text-xs opacity-90">Este cliente não pode realizar novas compras a prazo.</p>
                            </div>
                        </div>
                        <button
                            onClick={onBloquear}
                            className="px-3 py-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 text-xs font-bold rounded shadow-sm hover:bg-red-50 dark:hover:bg-gray-700"
                        >
                            Desbloquear
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {cliente.nome}
                                <button
                                    onClick={onEditarCliente}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit size={16} />
                                </button>
                            </h2>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {cliente.documento && (
                                <span className="flex items-center gap-1">
                                    <FileText size={14} /> {cliente.documento}
                                </span>
                            )}
                            {cliente.telefone && (
                                <span className="flex items-center gap-1">
                                    <Phone size={14} /> {cliente.telefone}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Saldo Devedor</p>
                        <p className={`text-3xl font-bold ${cliente.saldo_devedor > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {cliente.saldo_devedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {cliente.limite_credito > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                                Limite: {cliente.limite_credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 relative z-10 mt-4">
                    <button
                        onClick={onNovaNota}
                        disabled={!!cliente.bloqueado}
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-all
                            ${cliente.bloqueado
                                ? 'opacity-50 cursor-not-allowed grayscale'
                                : 'hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'
                            }`}
                    >
                        <Plus size={18} />
                        Nova Nota
                    </button>

                    <div className="flex-1"></div>

                    <button
                        onClick={onBloquear}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                            ${cliente.bloqueado
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                            }`}
                    >
                        <Ban size={16} /> {cliente.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                        onClick={onApagar}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Lista de Notas */}
            <NotasLista
                notas={notas}
                loading={loadingNotas}
                onPagamento={onPagamento}
            />
        </div>
    );
};
