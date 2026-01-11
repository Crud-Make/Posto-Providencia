import React, { useEffect, useRef } from 'react';
import { X, Save, MessageSquare } from 'lucide-react';

/**
 * Interface para as propriedades do modal de observação
 */
interface ObservacaoModalProps {
    /** Indica se o modal está visível */
    isOpen: boolean;
    /** Nome do frentista associado à observação */
    frentistaName: string;
    /** Dia do mês da observação */
    day: number;
    /** Texto da observação atual */
    currentObservacao: string;
    /** Função para fechar o modal */
    onClose: () => void;
    /** Função para salvar a nova observação */
    onSave: (observacao: string) => void;
}

/**
 * Modal para edição de observações diárias na escala
 * 
 * @param props - Propriedades do componente
 * @returns Elemento JSX do modal ou null se fechado
 */
const ObservacaoModal: React.FC<ObservacaoModalProps> = ({
    isOpen,
    frentistaName,
    day,
    currentObservacao,
    onClose,
    onSave
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={16} className="text-blue-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-blue-600/70">Anotação Diária</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                            {frentistaName}
                        </h3>
                        <p className="text-sm font-bold text-gray-400 mt-1">
                            Dia {day} • Escala de Trabalho
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-400 hover:text-red-600 transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                        Descrição da Observação
                    </label>
                    <textarea
                        ref={textareaRef}
                        defaultValue={currentObservacao}
                        placeholder="Ex: Consultas médica, troca de turno, atraso justificado..."
                        className="w-full h-40 p-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 dark:text-white transition-all text-sm font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    />
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-all border border-gray-200 dark:border-gray-700 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            if (textareaRef.current) {
                                onSave(textareaRef.current.value);
                            }
                        }}
                        className="flex-[1.5] px-6 py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 group"
                    >
                        <Save size={20} className="group-active:scale-90 transition-transform" />
                        Salvar Nota
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ObservacaoModal;
