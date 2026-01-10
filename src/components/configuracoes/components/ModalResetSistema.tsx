// [10/01 17:46] Criado durante refatoração Issue #16
import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { ModalResetSistemaProps } from '../types';

/**
 * Modal para confirmação de reset do sistema.
 * 
 * @param {ModalResetSistemaProps} props - Props do componente
 * @returns {JSX.Element | null} Componente renderizado
 */
export const ModalResetSistema: React.FC<ModalResetSistemaProps> = ({ 
    isOpen, 
    isResetting, 
    onClose, 
    onConfirm 
}) => {
    const [confirmText, setConfirmText] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border-2 border-red-500 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                        <AlertTriangle size={32} className="animate-pulse" />
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                ⚠️ Confirmação Necessária
                            </h3>
                            <p className="text-red-100 text-sm font-medium mt-1">
                                Esta ação é IRREVERSÍVEL!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-gray-900 dark:text-white font-bold mb-2">
                            📋 O que será removido:
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                            <li>Todas as leituras e vendas registradas</li>
                            <li>Todos os fechamentos de caixa</li>
                            <li>Todas as notas de frentista</li>
                            <li>Todas as compras de combustível</li>
                            <li>Todas as despesas registradas</li>
                            <li>Todas as dívidas e empréstimos</li>
                            <li>Todo o histórico de tanques</li>
                            <li>O estoque será zerado completamente</li>
                        </ul>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm text-gray-900 dark:text-white font-bold mb-2">
                            ✅ O que será mantido:
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                            <li>Cadastros de postos</li>
                            <li>Combustíveis, bombas e bicos</li>
                            <li>Fornecedores e formas de pagamento</li>
                            <li>Frentistas e turnos</li>
                            <li>Clientes (com saldo zerado)</li>
                            <li>Configurações do sistema</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white">
                            Para continuar, digite <span className="text-red-600 dark:text-red-400">RESETAR</span> abaixo:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder="Digite RESETAR"
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center text-lg"
                            disabled={isResetting}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => {
                                onClose();
                                setConfirmText("");
                            }}
                            disabled={isResetting}
                            className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(confirmText)}
                            disabled={isResetting || confirmText !== "RESETAR"}
                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isResetting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Resetando...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={18} />
                                    <span>Confirmar Reset</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
