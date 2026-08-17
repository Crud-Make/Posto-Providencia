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

import { usePosto } from '../../contexts/usePosto';
import { useCarregamentoDados } from './hooks/useCarregamentoDados';
import { useLeituras } from './hooks/useLeituras';
import { useSessoesFrentistas } from './hooks/useSessoesFrentistas';
import { usePagamentos } from './hooks/usePagamentos';
import { useFechamento } from './hooks/useFechamento';
import { useAutoSave } from './hooks/useAutoSave';
import { useSubmissaoFechamento } from './hooks/useSubmissaoFechamento';
import type { SessaoFrentista } from '../../types/fechamento';
import { supabase } from '../../services/supabase';

// Subcomponentes
import { HeaderFechamento, type AbaFechamento } from './components/HeaderFechamento';
import { TabLeituras } from './components/TabLeituras';
import { TabFinanceiro } from './components/TabFinanceiro';
// [20/01 11:30] Adição da aba Detalhamento Frentistas
// Motivo: Nova feature solicitada para visão detalhada por frentista
import { TabDetalhamentoFrentista } from './components/TabDetalhamentoFrentista';
import { TabGestaoBicos } from './components/TabGestaoBicos';
// lazy load para evitar peso inicial desnecessário
import FechamentoMensal from '../fechamento-mensal';
// [31/07] Painel herdado da antiga rota /financeiro ("Gestão Financeira"), agora aba daqui.
import { PainelReceitasDespesas } from '../financeiro';
import { FooterAcoes } from './components/FooterAcoes';
import { ProgressIndicator } from '@shared/ui/ValidationAlert';
import { hojeIso, conferido } from '@posto/utils';
import { useEstadoPersistido } from '@shared/lib/estado-persistido';
import { meiosDaSessao } from '../../utils/fechamentoMeios';
import { parseValue } from '../../utils/formatters';

const TelaFechamentoDiario: React.FC = () => {
   const { postoAtivoId, postoAtivo } = usePosto();

   // --- Estados de Contexto da Tela ---
   // Data própria, **fora** do `PeriodoContext` de propósito: esta é a tela onde se lança e se
   // salva dinheiro, e herdar a data de uma navegação de relatório abriria o fechamento num dia
   // que o usuário não escolheu aqui. Persistida só para não voltar a hoje ao trocar de tela.
   const [selectedDate, setSelectedDate] = useEstadoPersistido<string>('data-fechamento', hojeIso);
   const [activeTab, setActiveTab] = useState<AbaFechamento>('leituras');
   const [observacoes] = useState<string>('');

   // --- Hooks de Dados e Lógica (Refatorados) ---
   const { bicos, frentistas, carregando: loadingDados, carregarDados, updateBicoPrice } = useCarregamentoDados(postoAtivoId);

   const {
      leituras, carregando: loadingLeituras, carregarLeituras,
      alterarInicial, alterarFechamento, aoSairInicial, aoSairFechamento, calcLitros
   } = useLeituras(postoAtivoId, selectedDate, bicos, updateBicoPrice);

   const {
      sessoes: frentistaSessions, carregando: loadingSessoes,
      carregarSessoes, alterarCampoFrentista, aoSairCampoFrentista, definirSessoes, removerFrentista
   } = useSessoesFrentistas(postoAtivoId, frentistas);

   const {
      pagamentos: payments, carregando: loadingPagamentos, totalPagamentos, carregarPagamentos, alterarPagamento, aoSairPagamento,
      // [24/07 21:05] Passa a extrair sincronizarComSessoes: a aba Financeiro (TabFinanceiro) exige essa handler
      // no botão "auto-preencher". Sem ela: erro de tipo TS2741 (build quebra) + TypeError em runtime ao clicar.
      sincronizarComSessoes
   } = usePagamentos(postoAtivoId);

   // --- 🔴 REALTIME: Escuta envios do PWA em tempo real ---
   useEffect(() => {
      const channel = supabase
         .channel('pwa-envios-realtime')
         .on(
            'postgres_changes',
            {
               event: '*',
               schema: 'public',
               table: 'FechamentoFrentista'
            },
            (payload) => {
               console.log('🔔 Alteração de FechamentoFrentista detectada em tempo real:', payload.eventType, payload);
               // Recarrega as sessões forçando refresh
               if (selectedDate) {
                  carregarSessoes(selectedDate, true);
               }
            }
         )
         .subscribe((status) => {
            console.log('📡 Realtime status:', status);
         });

      return () => {
         supabase.removeChannel(channel);
      };
   }, [selectedDate, carregarSessoes]);

   // --- 🔴 REALTIME: Escuta leituras de bico (OCR encerrante) em tempo real ---
   useEffect(() => {
      const channel = supabase
         .channel('leituras-bico-realtime')
         .on(
            'postgres_changes',
            {
               event: '*',
               schema: 'public',
               table: 'Leitura'
            },
            (payload) => {
               console.log('🔔 Alteração de Leitura detectada em tempo real:', payload.eventType, payload);
               carregarLeituras(true);
            }
         )
         .subscribe((status) => {
            console.log('📡 Realtime status (Leitura):', status);
         });

      return () => {
         supabase.removeChannel(channel);
      };
   }, [carregarLeituras]);

   const { totalLitros, totalVendas, totalFrentistas, diferenca, podeFechar } = useFechamento(bicos, leituras, frentistaSessions, payments);

   const loading = loadingDados || loadingLeituras || loadingSessoes || loadingPagamentos;

   const { restaurado, rascunhoRestaurado, limparAutoSave } = useAutoSave({
      postoId: postoAtivoId, dataSelecionada: selectedDate,
      leituras, sessoesFrentistas: frentistaSessions, carregando: loading, salvando: false
   });

   const { saving, error, success, handleSave, setSuccess } = useSubmissaoFechamento();

   // --- Efeitos ---
   useEffect(() => {
      if (postoAtivoId) { carregarDados(); carregarPagamentos(); }
   }, [postoAtivoId, carregarDados, carregarPagamentos]);

   // [16/08] Os dois ajustes de turno que ficavam aqui saíram junto com o conceito: um
   // escolhia um turno padrão assim que a lista carregava, o outro restaurava o turno do
   // rascunho. Ambos existiam só para preencher um estado que ninguém mais lê — o dia é a
   // chave inteira do fechamento. De quebra some o gate: os carregamentos abaixo eram
   // barrados até a lista de turnos chegar do banco, e agora dependem só da data.

   useEffect(() => {
      if (restaurado && !saving && !success) {
         // As leituras dos bicos e os envios do PWA vêm do banco (OCR/PWA + realtime) —
         // nunca só do rascunho local, senão um rascunho antigo trava a tela pra sempre
         // com valores desatualizados (carregarSessoes mescla com o rascunho por baixo:
         // sessões já enviadas vêm do banco, sessões digitadas localmente e ainda não
         // enviadas continuam preservadas).
         carregarLeituras();
         if (rascunhoRestaurado?.sessoesFrentistas) definirSessoes(rascunhoRestaurado.sessoesFrentistas as SessaoFrentista[]);
         if (selectedDate) {
            carregarSessoes(selectedDate);
            // Os pagamentos do Caixa Geral também vêm do banco e precisam ser carregados AQUI.
            // Antes só o efeito de baixo os carregava, e ele é barrado por `!rascunhoRestaurado` —
            // como o rascunho é gravado automaticamente, na prática havia quase sempre um, e os
            // `Recebimento` salvos nunca voltavam: o bloco reabria zerado e a tela acusava sobra
            // de caixa igual ao total do dia.
            carregarPagamentos(selectedDate);
         }
      }
   }, [restaurado, rascunhoRestaurado, saving, success, carregarLeituras, carregarSessoes, carregarPagamentos, definirSessoes, selectedDate]);

   useEffect(() => {
      if (selectedDate && restaurado && !rascunhoRestaurado && !saving && !success) {
         carregarLeituras();
         carregarSessoes(selectedDate);
         carregarPagamentos(selectedDate);
      }
   }, [selectedDate, restaurado, rascunhoRestaurado, saving, success, carregarLeituras, carregarSessoes, carregarPagamentos]);

   // Dia sem `Recebimento` salvo: preenche o Caixa Geral com o que os frentistas
   // declararam, em vez de deixar em branco.
   //
   // POR QUÊ. O painel lê só a tabela `Recebimento`, e o ETL do histórico não a carrega
   // de propósito — as formas eletrônicas já entram em `FechamentoFrentista`, e carregar
   // as duas contaria em dobro (scripts/carga-historico-fechamento.py). Resultado: em
   // 200 dos 204 dias com movimento o bloco abria zerado e a tela acusava uma SOBRA DE
   // CAIXA do tamanho da venda do dia inteiro — R$ 14.119,81 no 15/06/2026, e o mesmo em
   // 31/31 dias de março e 30/30 de junho. É exatamente o que o botão "Auto-preencher"
   // já fazia com um clique; a diferença é não depender de o dono saber clicar nele.
   //
   // NÃO grava nada: só sugere na tela. O `Recebimento` só nasce se o dono salvar, o que
   // preserva a decisão do ETL de não ter as duas fontes no banco ao mesmo tempo.
   const derivacaoFeita = React.useRef<string | null>(null);
   useEffect(() => {
      if (!selectedDate || saving || success) return;
      if (loadingPagamentos || loadingSessoes || payments.length === 0) return;

      const chave = selectedDate;
      if (derivacaoFeita.current === chave) return;

      // Já veio valor do banco: respeita o que está salvo, não sobrescreve.
      if (payments.some(p => parseValue(p.valor) > 0)) {
         derivacaoFeita.current = chave;
         return;
      }

      // Sem movimento declarado ainda: não marca a chave, porque as sessões podem
      // chegar depois (realtime do PWA) e aí a derivação ainda deve acontecer.
      if (!frentistaSessions.some(s => conferido(meiosDaSessao(s)) > 0)) return;

      derivacaoFeita.current = chave;
      sincronizarComSessoes(frentistaSessions);
   }, [selectedDate, saving, success, loadingPagamentos, loadingSessoes, payments, frentistaSessions, sincronizarComSessoes]);

   // --- Render ---
   return (
      // [31/07] `pb-24` removido: era a reserva manual de espaço para a barra `fixed` do
      // FooterAcoes. Com a barra em `sticky` o espaço é reservado pelo próprio layout, e
      // manter o padding só criaria uma faixa vazia embaixo dela.
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
         <HeaderFechamento
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            activeTab={activeTab} setActiveTab={setActiveTab}
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
                        if (selectedDate) carregarSessoes(selectedDate, true);
                     }}
                     handlers={{
                        alterarInicial, alterarFechamento, aoSairInicial, aoSairFechamento, calcLitros,
                        alterarCampoFrentista, aoSairCampoFrentista, removerFrentista
                     }}
                     onUpdatePrice={updateBicoPrice}
                  />
               ) : activeTab === 'financeiro' ? (
                  <TabFinanceiro
                     payments={payments} totalPagamentos={totalPagamentos} totalLitros={totalLitros} totalFrentistas={totalFrentistas}
                     leituras={leituras} bicos={bicos} frentistaSessions={frentistaSessions} frentistas={frentistas} loading={loading}
                     dataSelecionada={selectedDate} postoId={postoAtivoId}
                     onRefreshSessoes={() => {
                        if (selectedDate) carregarSessoes(selectedDate, true);
                     }}
                     handlers={{ alterarPagamento, aoSairPagamento, sincronizarComSessoes }}
                  />
               ) : activeTab === 'detalhamento' ? (
                  <TabDetalhamentoFrentista
                     frentistaSessions={frentistaSessions}
                     frentistas={frentistas}
                     loading={loading}
                     onUpdateCampo={(tempId, campo, valor) => {
                        alterarCampoFrentista(tempId, campo as keyof SessaoFrentista, valor.toString());
                     }}
                  />
               ) : activeTab === 'receitas-despesas' ? (
                  <PainelReceitasDespesas />
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

         {/* // [31/07] A barra de salvar passa a existir só na aba Leituras de Bomba. */}
         {/* Motivo: estava fora do switch de abas, então aparecia nas 5. Em Fechamento */}
         {/* Mensal e Gestão de Bicos ela exibia Vendas/Apurado/Diferença zerados sobre um */}
         {/* painel que não tem nada a ver com o salvamento. Decisão do dono do produto em */}
         {/* 31/07: só na primeira aba. Consequência aceita: para salvar após editar em */}
         {/* Financeiro ou Detalhamento, é preciso voltar à aba Leituras de Bomba. */}
         {activeTab === 'leituras' && <FooterAcoes
            totalVendas={totalVendas} totalFrentistas={totalFrentistas} diferenca={diferenca} saving={saving} podeFechar={podeFechar}
            handleSave={() => handleSave({
               selectedDate,
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
                  if (selectedDate) {
                     carregarSessoes(selectedDate);
                     carregarPagamentos(selectedDate);
                  }
               }
            })}
         />}
      </div>
   );
};

export default TelaFechamentoDiario;
