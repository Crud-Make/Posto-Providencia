import React from 'react';
import { HelpCircle, Save } from 'lucide-react';

interface FooterAcoesProps {
    onApplyPrices: () => void;
}

const FooterAcoes: React.FC<FooterAcoesProps> = ({ onApplyPrices }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
                <p className="text-xs text-gray-400 hidden sm:block">
                    Dados processados em tempo real com base no histórico de leituras e notas fiscais de entrada.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <HelpCircle size={20} />
                        Ajuda
                    </button>
                    <button
                        onClick={onApplyPrices}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0d1b13] text-white text-sm font-bold hover:bg-black transition-colors shadow-lg"
                    >
                        <Save size={20} />
                        Aplicar Novos Preços
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FooterAcoes;
