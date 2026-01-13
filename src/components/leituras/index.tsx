// [13/01 10:10] Adicionado JSDoc para conformidade com Regra 5/Qualidade
/**
 * Tela de Registro de Leituras Diárias
 *
 * Permite ao usuário visualizar e registrar leituras de bicos (encerrantes) para o fechamento diário.
 * Gerencia a seleção de datas, carregamento de bicos e salvamento em lote.
 *
 * @module TelaLeituras
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react';
import { bicoService, leituraService } from '../../services/api';
import { usePosto } from '../../contexts/PostoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLeituras } from '../fechamento-diario/hooks/useLeituras';
import { TabelaLeituras } from './components/TabelaLeituras';
import { ResumoLeituras } from './components/ResumoLeituras';
import type { PumpGroup } from './types';
import type { BicoComDetalhes } from '../../types/fechamento';

/**
 * Componente principal para a tela de leituras.
 *
 * Exibe uma tabela de leituras agrupadas por bomba e um resumo dos totais.
 * Utiliza hooks personalizados para gerenciar o estado das leituras e bicos.
 *
 * @component
 * @returns {JSX.Element} A tela completa de registro de leituras.
 */
const TelaLeituras: React.FC = () => {
  // Context
  const { postoAtivoId } = usePosto();
  const { user } = useAuth();

  // State
  const [bicos, setBicos] = useState<BicoComDetalhes[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingBicos, setLoadingBicos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msgErro, setMsgErro] = useState<string | null>(null);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);

  // Hook de Leituras
  // Passamos null para turnoSelecionado pois é uma visualização diária
  const leiturasHook = useLeituras(postoAtivoId, selectedDate, null, bicos);
  const { carregarLeituras, leituras, totals } = leiturasHook;

  // Carrega bicos ao montar ou trocar posto
  useEffect(() => {
    if (postoAtivoId) {
      loadBicos();
    }
  }, [postoAtivoId]);

  // Carrega leituras quando bicos ou data mudam
  useEffect(() => {
    if (bicos.length > 0 && postoAtivoId) {
      carregarLeituras();
    }
  }, [bicos, selectedDate, postoAtivoId, carregarLeituras]);

  const loadBicos = async () => {
    try {
      setLoadingBicos(true);
      const data = await bicoService.getWithDetails(postoAtivoId);
      // O tipo retornado pelo service é compatível com BicoComDetalhes
      setBicos(data as BicoComDetalhes[]);
    } catch (err) {
      console.error('Erro ao carregar bicos:', err);
      setMsgErro('Erro ao carregar configurações dos bicos.');
    } finally {
      setLoadingBicos(false);
    }
  };

  const handleRefresh = () => {
    carregarLeituras();
    setMsgSucesso(null);
    setMsgErro(null);
  };

  const handleSave = async () => {
    if (!postoAtivoId) return;
    
    try {
      setSaving(true);
      setMsgErro(null);
      setMsgSucesso(null);

      const leiturasParaSalvar = bicos
        .filter(bico => {
          const l = leituras[bico.id];
          if (!l || !l.fechamento) return false;
          
          const inicial = parseFloat(l.inicial.replace('.', '').replace(',', '.'));
          const final = parseFloat(l.fechamento.replace('.', '').replace(',', '.'));
          
          return !isNaN(final) && final > inicial;
        })
        .map(bico => {
          const l = leituras[bico.id];
          const inicial = parseFloat(l.inicial.replace('.', '').replace(',', '.'));
          const final = parseFloat(l.fechamento.replace('.', '').replace(',', '.'));

          return {
            bico_id: bico.id,
            data: selectedDate,
            leitura_inicial: inicial,
            leitura_final: final,
            combustivel_id: bico.combustivel.id,
            preco_litro: bico.combustivel.preco_venda,
            usuario_id: user?.id || 1,
            posto_id: postoAtivoId,
            turno_id: null // Explicitamente null para leitura diária sem turno
          };
        });

      if (leiturasParaSalvar.length === 0) {
        setMsgErro('Nenhuma leitura válida para salvar (verifique se os valores finais são maiores que os iniciais).');
        return;
      }

      await leituraService.bulkCreate(leiturasParaSalvar);

      setMsgSucesso(`${leiturasParaSalvar.length} leituras salvas com sucesso!`);
      
      // Recarrega para confirmar
      await carregarLeituras();

    } catch (err) {
      console.error('Erro ao salvar:', err);
      setMsgErro('Erro ao salvar leituras. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Agrupamento de bicos por bomba
  const pumpGroups: PumpGroup[] = useMemo(() => {
    return bicos.reduce((acc, bico) => {
      const existingGroup = acc.find(g => g.bomba.id === bico.bomba.id);
      if (existingGroup) {
        existingGroup.bicos.push(bico);
      } else {
        acc.push({ bomba: bico.bomba, bicos: [bico] });
      }
      return acc;
    }, [] as PumpGroup[]);
  }, [bicos]);

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
              <RefreshCw size={18} className={`text-gray-500 ${leiturasHook.carregando ? 'animate-spin' : ''}`} />
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
