import React from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { useFiltrosFinanceiros } from './hooks/useFiltrosFinanceiros';
import { useFinanceiro } from './hooks/useFinanceiro';
import { useFluxoCaixa } from './hooks/useFluxoCaixa';
import { FiltrosFinanceiros } from './components/FiltrosFinanceiros';
import { ResumoFinanceiro } from './components/ResumoFinanceiro';
import { GraficoFluxoCaixa } from './components/GraficoFluxoCaixa';
import { TabelaTransacoes } from './components/TabelaTransacoes';
import { IndicadoresPerformance } from './components/IndicadoresPerformance';
import { LayoutDashboard, Loader2 } from 'lucide-react';

/**
 * Tela de Gestão Financeira.
 * 
 * Centraliza a visualização de dados financeiros do posto,
 * integrando receitas, despesas e fluxo de caixa.
 * 
 * @module TelaGestaoFinanceira
 */
const TelaGestaoFinanceira: React.FC = () => {
  const { postoAtivoId } = usePosto();

  const { filtros, atualizar, resetar, aplicarPreset } = useFiltrosFinanceiros(postoAtivoId || undefined);
  const { dados, carregando, erro, recarregar } = useFinanceiro(filtros);
  const { series } = useFluxoCaixa(dados, 'diario');

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white font-display uppercase tracking-wider">Gestão Financeira</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visão consolidada de receitas, despesas e fluxo de caixa.
          </p>
        </div>

        {/* Badge de status */}
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
          <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Visão Geral</span>
        </div>
      </div>

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
    </div>
  );
};

export default TelaGestaoFinanceira;

