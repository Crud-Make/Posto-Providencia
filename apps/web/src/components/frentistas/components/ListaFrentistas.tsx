import React from 'react';
import { User, ChevronRight } from 'lucide-react';
import { PerfilFrentista } from '../types';

interface ListaFrentistasProps {
    frentistas: PerfilFrentista[];
    frentistaSelecionadoId: string | null;
    onSelecionar: (id: string) => void;
}

export const ListaFrentistas: React.FC<ListaFrentistasProps> = ({
    frentistas,
    frentistaSelecionadoId,
    onSelecionar
}) => {
    if (frentistas.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                Nenhum frentista encontrado.
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {frentistas.map((frentista) => (
                <div
                    key={frentista.id}
                    onClick={() => onSelecionar(frentista.id)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${frentistaSelecionadoId === frentista.id ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${frentistaSelecionadoId === frentista.id
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                            }`}>
                            {frentista.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className={`font-medium ${frentistaSelecionadoId === frentista.id ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-white'
                                }`}>
                                {frentista.nome}
                            </h3>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${frentista.status === 'Ativo'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    {frentista.status}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    CPF: {frentista.cpf}
                                </span>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${frentistaSelecionadoId === frentista.id ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                </div>
            ))}
        </div>
    );
};
