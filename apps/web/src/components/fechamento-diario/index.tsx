/**
 * Tela de Fechamento de Caixa Diário
 *
 * @remarks
 * Componente principal para o processo de fechamento de caixa.
 * Gerencia leituras de bicos, frentistas, pagamentos e conferência.
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 3.0.0
 */

// [18/01 11:35] Refatoração final: Modularização completa, extração de handleSave e subcomponentes de abas.
// Motivo: Reduzir complexidade do orquestrador e cumprir meta de < 150 linhas.

// [19/01 00:30] Ajuste de layout: Removido max-width de 1600px para usar a largura total da tela.
// Motivo: Usuário relatou que a tela estava muito comprimida no meio.

// [20/01 10:00] Integração da função updateBicoPrice no fluxo da tela
// Motivo: Permitir a edição local de preços na tabela de leituras

import * as React from 'react';
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { usePosto } from '../../contexts/PostoContext';
import { useCarregamentoDados } from './hooks/useCarregamentoDados';
import { useLeituras } from './hooks/useLeituras';
import { useSessoesFrentistas } from './hooks/useSessoesFrentistas';
import { usePagamentos } from './hooks/usePagamentos';
import { useFechamento } from './hooks/useFechamento';
import { useAutoSave } from './hooks/useAutoSave';
import { useSubmissaoFechamento } from './hooks/useSubmissaoFechamento';
import type { SessaoFrentista } from '../../types/fechamento';

// Subcomponentes
import { HeaderFechamento } from './components/HeaderFechamento';
import { TabLeituras } from './components/TabLeituras';
import { TabFinanceiro } from './components/TabFinanceiro';
// [20/01 11:30] Adição da aba Detalhamento Frentistas
// Motivo: Nova feature solicitada para visão detalhada por frentista
import { TabDetalhamentoFrentista } from './components/TabDetalhamentoFrentista';
import { TabGestaoBicos } from './components/TabGestaoBicos';
// lazy load para evitar peso inicial desnecessário
import FechamentoMensal from '../fechamento-mensal';
import { FooterAcoes } from './components/FooterAcoes';
import { ProgressIndicator } from '@shared/ui/ValidationAlert';

const TelaFechamentoDiario: React.FC = () => {
   const { user } = useAuth();
   const { postoAtivoId, postoAtivo } = usePosto();

   // --- Estados de Contexto da Tela ---
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [selectedTurno, setSelectedTurno] = useState<number | null>(null);
   const [activeTab, setActiveTab] = useState<'leituras' | 'financeiro' | 'detalhamento' | 'gestao-bicos' | 'fechamento-mensal'>('leituras');
   const [observacoes] = useState<string>('');

   // --- Hooks de Dados e Lógica (Refatorados) ---
   const { bicos, frentistas, turnos, carregando: loadingDados, carregarDados, updateBicoPrice } = useCarregamentoDados(postoAtivoId);

   const {
      leituras, carregando: loadingLeituras, carregarLeituras,
      alterarInicial, alterarFechamento, aoSairInicial, aoSairFechamento, calcLitros, definirLeituras
   } = useLeituras(postoAtivoId, selectedDate, selectedTurno, bicos);

   const {
      sessoes: frentistaSessions, carregando: loadingSessoes, totais: frentistasTotals,
      carregarSessoes, alterarCampoFrentista, aoSairCampoFrentista, definirSessoes
   } = useSessoesFrentistas(postoAtivoId, frentistas);

   const {
      pagamentos: payments, carregando: loadingPagamentos, totalPagamentos, carregarPagamentos, alterarPagamento, aoSairPagamento
   } = usePagamentos(postoAtivoId);

   const { totalLitros, totalVendas, totalFrentistas, diferenca, podeFechar } = useFechamento(bicos, leituras, frentistaSessions, payments);

   const loading = loadingDados || loadingLeituras || loadingSessoes || loadingPagamentos;

   const { restaurado, rascunhoRestaurado, limparAutoSave } = useAutoSave({
      postoId: postoAtivoId, dataSelecionada: selectedDate, turnoSelecionado: selectedTurno,
      leituras, sessoesFrentistas: frentistaSessions, carregando: loading, salvando: false
   });

   const { saving, error, success, handleSave, setSuccess } = useSubmissaoFechamento();

   // --- Efeitos ---
   useEffect(() => {
      if (postoAtivoId) { carregarDados(); carregarPagamentos(); }
   }, [postoAtivoId, carregarDados, carregarPagamentos]);

   useEffect(() => {
      if (turnos.length > 0 && !selectedTurno) {
         const diario = turnos.find(t => t.nome.toLowerCase().includes('diário') || t.nome.toLowerCase().includes('diario'));
         setSelectedTurno(diario ? diario.id : turnos[0].id);
      }
   }, [turnos, selectedTurno]);

   useEffect(() => {
      if (restaurado && !saving && !success) {
         if (rascunhoRestaurado) {
            if (rascunhoRestaurado.leituras) definirLeituras(rascunhoRestaurado.leituras);
            if (rascunhoRestaurado.sessoesFrentistas) definirSessoes(rascunhoRestaurado.sessoesFrentistas as SessaoFrentista[]);
            if (rascunhoRestaurado.turnoSelecionado) setSelectedTurno(rascunhoRestaurado.turnoSelecionado);
         } else {
            carregarLeituras();
            if (selectedDate && selectedTurno) carregarSessoes(selectedDate, selectedTurno);
         }
      }
   }, [restaurado, rascunhoRestaurado, saving, success, carregarLeituras, definirLeituras, carregarSessoes, definirSessoes, selectedDate, selectedTurno]);

   useEffect(() => {
      if (selectedDate && selectedTurno && restaurado && !rascunhoRestaurado && !saving && !success) {
         carregarLeituras();
         carregarSessoes(selectedDate, selectedTurno);
         carregarPagamentos(selectedDate, selectedTurno);
      }
   }, [selectedDate, selectedTurno, restaurado, rascunhoRestaurado, saving, success, carregarLeituras, carregarSessoes, carregarPagamentos]);

   // --- Render ---
   if (!user) return <div className="p-8 text-center text-slate-300">Carregando usuário...</div>;

   return (
      <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans selection:bg-blue-500/30">
         <HeaderFechamento
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            selectedTurno={selectedTurno} setSelectedTurno={setSelectedTurno}
            turnos={turnos} activeTab={activeTab} setActiveTab={setActiveTab}
            postoNome={postoAtivo?.nome} loading={loadingDados}
         />

         <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {loading && <div className="mb-6"><ProgressIndicator current={50} total={100} label="Sincronizando dados..." /></div>}
            {error && <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30 flex items-center gap-3 animate-shake"><AlertTriangle size={20} className="text-red-400" /><span>{error}</span></div>}
            {success && <div className="p-4 bg-emerald-900/20 text-emerald-200 rounded-xl border border-emerald-500/30 flex items-center gap-3 animate-bounce-subtle"><TrendingUp size={20} className="text-emerald-400" /><span>{success}</span></div>}

            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-1">
               {activeTab === 'leituras' ? (
                  <TabLeituras
                     bicos={bicos} leituras={leituras} frentistaSessions={frentistaSessions} frentistas={frentistas} loading={loading}
                     onRefreshSessoes={() => {
                        if (selectedDate && selectedTurno) carregarSessoes(selectedDate, selectedTurno);
                     }}
                     handlers={{
                        alterarInicial, alterarFechamento, aoSairInicial, aoSairFechamento, calcLitros,
                        alterarCampoFrentista, aoSairCampoFrentista
                     }}
                     onUpdatePrice={updateBicoPrice}
                  />
               ) : activeTab === 'financeiro' ? (
                  <TabFinanceiro
                     payments={payments} totalPagamentos={totalPagamentos} totalLitros={totalLitros} totalFrentistas={totalFrentistas}
                     leituras={leituras} bicos={bicos} frentistaSessions={frentistaSessions} frentistas={frentistas} loading={loading}
                     onRefreshSessoes={() => {
                        if (selectedDate && selectedTurno) carregarSessoes(selectedDate, selectedTurno);
                     }}
                     handlers={{ alterarPagamento, aoSairPagamento }}
                  />
               ) : activeTab === 'detalhamento' ? (
                  <TabDetalhamentoFrentista
                     frentistaSessions={frentistaSessions}
                     frentistas={frentistas}
                     totalVendasPosto={totalVendas}
                     loading={loading}
                     onUpdateCampo={(tempId, campo, valor) => {
                        // Type assertion to ensure campo is a valid key of SessaoFrentista
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        alterarCampoFrentista(tempId, campo as any, valor.toString());
                     }}
                     data={selectedDate}
                  />
               ) : activeTab === 'fechamento-mensal' ? (
                  <FechamentoMensal isEmbedded={true} />
               ) : (
                  <TabGestaoBicos
                     bicos={bicos}
                     leituras={leituras}
                     loading={loading}
                  />
               )}
            </div>
         </div>

         <FooterAcoes
            totalVendas={totalVendas} totalFrentistas={totalFrentistas} diferenca={diferenca} saving={saving} podeFechar={podeFechar}
            handleSave={() => handleSave({
               selectedDate,
               selectedTurno,
               bicos,
               leituras,
               sessoesFrentistas: frentistaSessions,
               payments,
               totalVendas,
               totalFrentistas,
               diferenca,
               podeFechar,
               observacoes,
               limparAutoSave,
               onSuccess: () => {
                  setSuccess(null);
                  carregarLeituras();
                  if (selectedDate && selectedTurno) {
                     carregarSessoes(selectedDate, selectedTurno);
                     carregarPagamentos(selectedDate, selectedTurno);
                  }
               }
            })}
         />
      </div>
   );
};

export default TelaFechamentoDiario;
