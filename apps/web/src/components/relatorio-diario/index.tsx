import React from 'react';
import { useRelatorioDiario } from './hooks/useRelatorioDiario';
import ResumoKPIs from './components/ResumoKPIs';
import TabelaDetalhamento from './components/TabelaDetalhamento';
import GraficoLucratividade from './components/GraficoLucratividade';
import ListaDespesas from './components/ListaDespesas';
import CardResultado from './components/CardResultado';
import FiltroData from './components/FiltroData';

const TelaRelatorioDiario: React.FC = () => {
    const {
        selectedDate,
        setSelectedDate,
        loading,
        shiftsData,
        totals,
        expensesDay,
        fmtMoney,
        fmtLitros
    } = useRelatorioDiario();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500">
                Carregando dados...
            </div>
        );
    }

    return (
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-gray-900 dark:text-gray-100">
                        Relatório Diário
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Visão consolidada de vendas, lucro e fechamentos do dia.
                    </p>
                </div>

                <FiltroData
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />
            </div>

            {/* KPI Cards */}
            <ResumoKPIs
                totals={totals}
                expensesCount={expensesDay.length}
                fmtMoney={fmtMoney}
                fmtLitros={fmtLitros}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Shifts and Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Detailed Table */}
                    <TabelaDetalhamento
                        shiftsData={shiftsData}
                        totals={totals}
                        fmtMoney={fmtMoney}
                        fmtLitros={fmtLitros}
                    />

                    {/* Chart */}
                    <GraficoLucratividade
                        shiftsData={shiftsData}
                        fmtMoney={fmtMoney}
                    />
                </div>

                {/* Right Column: Expenses and Summary */}
                <div className="space-y-6">
                    {/* Expenses List */}
                    <ListaDespesas
                        expenses={expensesDay}
                        totalDespesas={totals.despesas}
                        fmtMoney={fmtMoney}
                    />

                    {/* Final Result Card */}
                    <CardResultado
                        totals={totals}
                        fmtMoney={fmtMoney}
                    />
                </div>
            </div>
        </div>
    );
};

export default TelaRelatorioDiario;
