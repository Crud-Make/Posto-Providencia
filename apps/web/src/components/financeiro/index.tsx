import React, { useState } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { useFiltrosFinanceiros } from './hooks/useFiltrosFinanceiros';
import { useFinanceiro } from './hooks/useFinanceiro';
import { useFluxoCaixa } from './hooks/useFluxoCaixa';
import { FiltrosFinanceiros } from './components/FiltrosFinanceiros';
import { ResumoFinanceiro } from './components/ResumoFinanceiro';
import { GraficoFluxoCaixa } from './components/GraficoFluxoCaixa';
import { TabelaTransacoes } from './components/TabelaTransacoes';
import { IndicadoresPerformance } from './components/IndicadoresPerformance';
import { GestaoEmprestimosComponent } from './components/GestaoEmprestimos';
import { LayoutDashboard, Wallet, Loader2 } from 'lucide-react';

/**
 * Tela de Gestão Financeira (Orquestrador).
 * 
 * Centraliza a visualização de dados financeiros do posto,
 * integrando receitas, despesas e gestão de empréstimos.
 * 
 * @module TelaGestaoFinanceira
 */
const TelaGestaoFinanceira: React.FC = () => {
  const { postoAtivoId } = usePosto();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'emprestimos'>('dashboard');

  const { filtros, atualizar, resetar, aplicarPreset } = useFiltrosFinanceiros(postoAtivoId || undefined);
  const { dados, carregando, erro, recarregar } = useFinanceiro(filtros);
  const { series } = useFluxoCaixa(dados, 'diario');

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão Financeira</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {activeTab === 'dashboard' 
              ? 'Visão consolidada de receitas, despesas e fluxo de caixa.' 
              : 'Gerencie empréstimos, parcelas e compromissos futuros.'}
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('emprestimos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'emprestimos'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Wallet size={18} />
            Empréstimos
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          <FiltrosFinanceiros
            filtros={filtros}
            onAplicar={atualizar}
            onReset={resetar}
            onPreset={aplicarPreset}
          />

          {erro && (
             <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between items-center">
               <span>{erro}</span>
               <button onClick={() => recarregar()} className="text-sm underline hover:text-red-800">Tentar novamente</button>
             </div>
          )}

          <ResumoFinanceiro dados={dados} carregando={carregando} />

          {carregando ? (
             <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-gray-400">
               <Loader2 size={48} className="animate-spin mb-4" />
               <p className="font-medium">Carregando dados financeiros...</p>
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                  <GraficoFluxoCaixa series={series} />
                </div>
                <div>
                  <IndicadoresPerformance dados={dados} />
                </div>
              </div>
              <TabelaTransacoes transacoes={dados.transacoes} />
            </>
          )}
        </>
      ) : (
        <GestaoEmprestimosComponent />
      )}
    </div>
  );
};

export default TelaGestaoFinanceira;
