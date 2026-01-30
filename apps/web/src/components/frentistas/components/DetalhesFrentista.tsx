import React, { useEffect } from 'react';
import { User, Edit, Trash2, ShieldCheck, Mail, Clock } from 'lucide-react';
import { PerfilFrentista } from '../types';
import { useHistoricoFrentista } from '../hooks/useHistoricoFrentista';
import { paraReais as formatarMoeda } from '../../../utils/formatters';

interface DetalhesFrentistaProps {
    frentista: PerfilFrentista;
    onEditar: (frentista: PerfilFrentista) => void;
    onExcluir: (id: string) => void;
}

export const DetalhesFrentista: React.FC<DetalhesFrentistaProps> = ({
    frentista,
    onEditar,
    onExcluir
}) => {
    const { historico, loadingHistorico, carregarHistorico } = useHistoricoFrentista();

    useEffect(() => {
        if (frentista?.id) {
            carregarHistorico(frentista.id);
        }
    }, [frentista, carregarHistorico]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden sticky top-6">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {frentista.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{frentista.nome}</h2>
                            <p className="text-gray-500 dark:text-gray-400">Admissão: {new Date(frentista.dataAdmissao).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEditar(frentista)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                            title="Editar frentista"
                        >
                            <Edit size={20} />
                        </button>
                        <button
                            onClick={() => onExcluir(frentista.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            title="Excluir frentista"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-medium">CPF</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{frentista.cpf}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                            <User size={16} />
                            <span className="text-xs font-medium">Status</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${frentista.status === 'Ativo'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                            {frentista.status}
                        </span>
                    </div>
                </div>

                {/* Histórico Recente */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock size={16} />
                        Histórico Recente (30 dias)
                    </h3>

                    {loadingHistorico ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : historico.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                            Nenhum registro encontrado
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {historico.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {new Date(entry.data).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{entry.turno}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-medium ${entry.status === 'OK' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {entry.status}
                                        </div>
                                        {entry.valor !== 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {entry.valor > 0 ? '+' : ''}{formatarMoeda(entry.valor)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
