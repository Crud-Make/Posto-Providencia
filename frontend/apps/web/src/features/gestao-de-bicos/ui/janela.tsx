import React from 'react';
import { X } from 'lucide-react';

interface JanelaProps {
    readonly titulo: string;
    readonly aoFechar: () => void;
    readonly children: React.ReactNode;
}

/** A janela sobre a tela para os formulários de bomba e bico. */
export const Janela: React.FC<JanelaProps> = ({ titulo, aoFechar, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{titulo}</h3>
                <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} />
                </button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

/** Rótulo + campo, no mesmo desenho em todos os formulários do slice. */
export const Campo: React.FC<{ readonly rotulo: string; readonly children: React.ReactNode }> = ({ rotulo, children }) => (
    <label className="block space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{rotulo}</span>
        {children}
    </label>
);

interface RodapeProps {
    readonly erro: string | null;
    readonly gravando: boolean;
    readonly aoCancelar: () => void;
}

/** A recusa do servidor (ou do formulário) e os botões Cancelar/Salvar. */
export const RodapeDoFormulario: React.FC<RodapeProps> = ({ erro, gravando, aoCancelar }) => (
    <>
        {erro !== null && (
            <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={aoCancelar} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900">
                Cancelar
            </button>
            <button type="submit" disabled={gravando} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {gravando ? 'Salvando…' : 'Salvar'}
            </button>
        </div>
    </>
);
