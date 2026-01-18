/**
 * Tela de Registro de Leituras Diárias
 *
 * Permite ao usuário visualizar e registrar leituras de bicos (encerrantes) para o fechamento diário.
 * Gerencia a seleção de datas, carregamento de bicos e salvamento em lote.
 *
 * @module TelaLeiturasDiarias
 */
import React from 'react';
import {
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react';
import { usePosto } from '../../contexts/PostoContext';
import { useLeiturasDiarias } from './hooks/useLeiturasDiarias';
import { TabelaLeituras } from './components/TabelaLeituras';
import { ResumoLeituras } from './components/ResumoLeituras';

/**
 * Componente principal para a tela de leituras.
 *
 * Exibe uma tabela de leituras agrupadas por bomba e um resumo dos totais.
 * Utiliza o hook useLeiturasDiarias para gerenciar a lógica de negócio.
 *
 * @component
 */
const TelaLeituras: React.FC = () => {
  const { postoAtivoId } = usePosto();

  const {
    selectedDate,
    setSelectedDate,
    loadingBicos,
    saving,
    msgErro,
    msgSucesso,
    leiturasHook,
    pumpGroups,
    handleRefresh,
    handleSave,
  } = useLeiturasDiarias(postoAtivoId);

  const { totals, carregando } = leiturasHook;

  if (loadingBicos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-500 font-medium">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Registro de Leituras Diárias</h1>
          <p className="text-gray-500 mt-2">Preencha os dados dos encerrantes de cada bico para o fechamento diário.</p>
        </div>

        <div className="flex gap-4">
          {/* Date Picker */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data</span>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-[42px]">
              <Calendar size={18} className="text-gray-400 ml-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 text-sm font-semibold text-gray-900 outline-none border-none bg-transparent"
              />
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 h-[42px] shadow-sm hover:bg-gray-50 transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw size={18} className={`text-gray-500 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {msgErro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          {msgErro}
        </div>
      )}
      {msgSucesso && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {msgSucesso}
        </div>
      )}

      {/* Main Content */}
      <TabelaLeituras groups={pumpGroups} leiturasHook={leiturasHook} />

      {/* Summary */}
      <ResumoLeituras leiturasHook={leiturasHook} />

      {/* Floating Action Button for Save */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={handleSave}
          disabled={saving || totals.litros <= 0}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-full shadow-lg font-bold text-white transition-all transform hover:scale-105 active:scale-95
            ${saving || totals.litros <= 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200/50'
            }
          `}
        >
          {saving ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Save size={24} />
          )}
          <span>{saving ? 'Salvando...' : 'Salvar Leituras'}</span>
        </button>
      </div>
    </div>
  );
};

export default TelaLeituras;
