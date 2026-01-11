import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react';

/**
 * Interface para as propriedades do cabeçalho da escala
 */
interface EscalaHeaderProps {
    /** Data atual da visualização da escala */
    dataAtual: Date;
    /** Função para navegar para o mês anterior */
    onMesAnterior: () => void;
    /** Função para navegar para o próximo mês */
    onProximoMes: () => void;
    /** Função para acionar a exportação da escala para PDF */
    onExportarPDF: () => void;
}

/**
 * Cabeçalho do componente de escalas com navegação de data e exportação
 * 
 * @param props - Propriedades do componente
 * @returns Elemento JSX do cabeçalho
 */
const EscalaHeader: React.FC<EscalaHeaderProps> = ({
    dataAtual,
    onMesAnterior,
    onProximoMes,
    onExportarPDF
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <Calendar className="text-blue-600" size={32} />
                    Gestão de Escalas
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    Controle de folgas e escala mensal da equipe.
                </p>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <button
                    onClick={onMesAnterior}
                    className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-90 text-gray-600 dark:text-gray-400"
                    title="Mês Anterior"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="px-4 min-w-[160px] text-center">
                    <span className="block text-xs font-bold text-blue-600 uppercase tracking-wider">Mês de Referência</span>
                    <span className="font-black text-lg text-gray-900 dark:text-white capitalize leading-tight">
                        {dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <button
                    onClick={onProximoMes}
                    className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-90 text-gray-600 dark:text-gray-400"
                    title="Próximo Mês"
                >
                    <ChevronRight size={20} />
                </button>
                <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button
                    onClick={onExportarPDF}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95 font-bold shadow-md shadow-blue-500/20"
                    title="Exportar para PDF"
                >
                    <Download size={18} />
                    <span className="hidden sm:inline">Exportar PDF</span>
                </button>
            </div>
        </div>
    );
};

export default EscalaHeader;
