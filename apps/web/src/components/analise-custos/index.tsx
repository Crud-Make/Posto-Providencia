import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAnaliseCustos } from './hooks/useAnaliseCustos';
import HeaderAnalise from './components/HeaderAnalise';
import CardCombustivel from './components/CardCombustivel';
import RankingLucratividade from './components/RankingLucratividade';
import ResumoEconomico from './components/ResumoEconomico';
import FooterAcoes from './components/FooterAcoes';

const TelaAnaliseCustos: React.FC = () => {
    const {
        loading,
        data,
        margins,
        setMargins,
        currentDate,
        handlePrevMonth,
        handleNextMonth,
        exportToCSV,
        handleApplyPrices,
        calculatePrice,
        calculateProfit
    } = useAnaliseCustos();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-[#13ec6d]">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Analisando dados financeiros...</p>
            </div>
        );
    }

    const totalProfitSum = data.reduce((acc, item) => acc + (item.lucroTotal || 0), 0);

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">
            
            <HeaderAnalise
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onExport={exportToCSV}
            />

            {/* Main Grid: Analysis Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {data.map((item) => (
                    <CardCombustivel
                        key={item.id}
                        item={item}
                        currentMargin={margins[item.combustivelId] || 0}
                        onMarginChange={(value) => setMargins(prev => ({ ...prev, [item.combustivelId]: value }))}
                        calculatePrice={calculatePrice}
                        calculateProfit={calculateProfit}
                    />
                ))}
            </div>

            {/* Bottom Grid: Table and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RankingLucratividade data={data} totalProfitSum={totalProfitSum} />
                <ResumoEconomico data={data} totalProfitSum={totalProfitSum} />
            </div>

            <FooterAcoes onApplyPrices={handleApplyPrices} />
        </div>
    );
};

export default TelaAnaliseCustos;
