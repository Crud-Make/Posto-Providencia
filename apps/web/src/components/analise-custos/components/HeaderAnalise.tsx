import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Settings, Download } from 'lucide-react';

interface HeaderAnaliseProps {
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onExport: () => void;
}

const HeaderAnalise: React.FC<HeaderAnaliseProps> = ({
    currentDate,
    onPrevMonth,
    onNextMonth,
    onExport
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#13ec6d]/10 text-[#0eb553] border border-[#13ec6d]/20">Financeiro</span>
                    <span className="text-xs text-gray-400">Análise Mensal Real</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">Análise de Custo e Margem</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">Gerencie a lucratividade por combustível, simule preços e monitore margens líquidas.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 shadow-sm h-10">
                    <button
                        onClick={onPrevMonth}
                        className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 px-3 border-x border-gray-100 dark:border-gray-700 mx-1">
                        <Calendar size={18} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).slice(1)}
                        </span>
                    </div>
                    <button
                        onClick={onNextMonth}
                        className="p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <button
                    onClick={() => alert('Para configurar a despesa operacional, acesse:\n\nMenu → Configurações → Configurações Financeiras\n\nLá você pode ajustar o valor de R$/litro aplicado nos cálculos de margem líquida.')}
                    className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <Settings size={20} />
                    <span>Configurar Despesas</span>
                </button>
                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[#13ec6d] text-[#0d1b13] text-sm font-bold hover:bg-[#13ec6d]/90 transition-colors shadow-sm shadow-[#13ec6d]/20"
                >
                    <Download size={20} />
                    <span>Exportar Relatório</span>
                </button>
            </div>
        </div>
    );
};

export default HeaderAnalise;
