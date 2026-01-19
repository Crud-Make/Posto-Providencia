import React from 'react';
import { FileText, Edit2 } from 'lucide-react';
import type { Escala } from '../../services/api/escala.service';
import type { Frentista } from '@posto/types';

/**
 * Interface para as propriedades da tabela de escala
 */
interface EscalaTableProps {
    /** Indica se os dados estão sendo carregados */
    carregando: boolean;
    /** Lista de frentistas ativos */
    frentistas: Frentista[];
    /** Lista de escalas registradas para o mês */
    escalas: Escala[];
    /** Array com os dias do mês (1 a 31) */
    dias: number[];
    /** Função para verificar se o dia é final de semana */
    ehFinalDeSemana: (dia: number) => boolean;
    /** Função para obter a letra do dia da semana */
    obterLabelDia: (dia: number) => string;
    /** Função acionada ao clicar em uma célula */
    onCliqueCelula: (frentistaId: number, dia: number) => void;
    /** Função para abrir o modal de observação */
    onAbrirObservacao: (frentistaId: number, nomeFrentista: string, dia: number) => void;
    /** Função para formatar data ISO */
    formatarData: (ano: number, mes: number, dia: number) => string;
    /** Ano de referência */
    anoAtual: number;
    /** Mês de referência (0-11) */
    mesAtual: number;
}

/**
 * Tabela principal da escala com frentistas nas linhas e dias nas colunas
 * 
 * @param props - Propriedades do componente
 * @returns Elemento JSX da tabela
 */
const EscalaTable: React.FC<EscalaTableProps> = ({
    carregando,
    frentistas,
    escalas,
    dias,
    ehFinalDeSemana,
    obterLabelDia,
    onCliqueCelula,
    onAbrirObservacao,
    formatarData,
    anoAtual,
    mesAtual
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400">
                        <tr>
                            <th className="p-6 min-w-[240px] sticky left-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest px-1">Colaborador</span>
                            </th>
                            {dias.map(dia => (
                                <th
                                    key={dia}
                                    className={`p-3 text-center min-w-[48px] border-l border-gray-100/50 dark:border-gray-700/50 ${ehFinalDeSemana(dia) ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                                        }`}
                                >
                                    <div className="font-black text-gray-900 dark:text-gray-100">{dia}</div>
                                    <div className="text-[10px] font-bold opacity-50 uppercase">{obterLabelDia(dia)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {carregando ? (
                            <tr>
                                <td colSpan={dias.length + 1} className="p-20 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Sincronizando Escala...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : frentistas.length === 0 ? (
                            <tr>
                                <td colSpan={dias.length + 1} className="p-20 text-center text-gray-400">
                                    <p className="font-medium">Nenhum frentista ativo encontrado para este posto.</p>
                                </td>
                            </tr>
                        ) : (
                            frentistas.map(frentista => (
                                <tr key={frentista.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    <td className="p-4 px-6 font-bold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 z-10 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-black shadow-sm ring-1 ring-blue-200/50 dark:ring-blue-900/50">
                                            {frentista.nome.charAt(0)}
                                        </div>
                                        <span className="truncate">{frentista.nome}</span>
                                    </td>
                                    {dias.map(dia => {
                                        const strData = formatarData(anoAtual, mesAtual, dia);
                                        const escala = escalas.find(e => e.frentista_id === frentista.id && e.data === strData);
                                        const ehFolga = escala?.tipo === 'FOLGA';
                                        const temObservacao = escala?.observacao && escala.observacao.trim() !== '';

                                        return (
                                            <td
                                                key={dia}
                                                onClick={() => onCliqueCelula(frentista.id, dia)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    onAbrirObservacao(frentista.id, frentista.nome, dia);
                                                }}
                                                className={`p-1.5 border-l border-gray-100/50 dark:border-gray-700/50 cursor-pointer text-center relative group/cell ${ehFinalDeSemana(dia) ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''
                                                    }`}
                                            >
                                                <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${ehFolga
                                                        ? 'bg-red-500 text-white font-black shadow-lg shadow-red-500/30 ring-2 ring-red-200 dark:ring-red-900'
                                                        : 'bg-transparent text-gray-300 dark:text-gray-700 group-hover/cell:bg-blue-100 dark:group-hover/cell:bg-blue-900/30 group-hover/cell:text-blue-500'
                                                    }`}>
                                                    {ehFolga ? 'F' : '•'}
                                                    {temObservacao && (
                                                        <div
                                                            className={`absolute -top-1.5 -right-1.5 p-1 rounded-full shadow-md ring-2 ${ehFolga
                                                                    ? 'bg-white text-blue-600 ring-red-500'
                                                                    : 'bg-blue-600 text-white ring-white dark:ring-gray-800'
                                                                }`}
                                                            title={escala.observacao}
                                                        >
                                                            <FileText size={10} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Botão flutuante para editar observação (apenas desktop hover) */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAbrirObservacao(frentista.id, frentista.nome, dia);
                                                    }}
                                                    className="absolute -top-2 -right-2 opacity-0 group-hover/cell:opacity-100 p-1.5 bg-gray-900 text-white rounded-lg transition-all z-20 hover:scale-110 shadow-lg"
                                                    title="Editar Anotação"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EscalaTable;
