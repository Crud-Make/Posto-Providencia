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
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, TrendingUp } from 'lucide-react';

import { usePosto } from '../../contexts/usePosto';
import { useCarregamentoDados } from './hooks/useCarregamentoDados';
import { useCustoMensal } from './hooks/useCustoMensal';
import { useLeituras } from './hooks/useLeituras';
import { useSessoesFrentistas } from './hooks/useSessoesFrentistas';
import { usePagamentos } from './hooks/usePagamentos';
import { useFechamento } from './hooks/useFechamento';
import { useAutoSave } from './hooks/useAutoSave';
import { useSubmissaoFechamento } from './hooks/useSubmissaoFechamento';
import type { SessaoFrentista } from '../../types/fechamento';
import { loginPelaApiLigado } from '../../services/api/base';
import { useTempoRealDoFechamento } from './hooks/useTempoRealDoFechamento';
import { AvisoSemTempoReal } from './components/AvisoSemTempoReal';
import { AbaForaDaApi } from './components/AbaForaDaApi';

// Subcomponentes
import { HeaderFechamento } from './components/HeaderFechamento';
import { abaFechamentoDe, type AbaFechamento } from './abas';
import { TabLeituras } from './components/TabLeituras';
// [20/01 11:30] Adição da aba Detalhamento Frentistas
// Motivo: Nova feature solicitada para visão detalhada por frentista
import { TabDetalhamentoFrentista } from './components/TabDetalhamentoFrentista';
import { TabGestaoBicos } from './components/TabGestaoBicos';
// lazy load para evitar peso inicial desnecessário
import FechamentoMensal from '../fechamento-mensal';
// [31/07] Painel herdado da antiga rota /financeiro ("Gestão Financeira"), agora aba daqui.
import { PainelReceitasDespesas } from '../financeiro';
import { FooterAcoes } from './components/FooterAcoes';
import { ProgressIndicator } from '@shared/ui/ProgressIndicator';
import { hojeIso, conferido, deIsoLocal, somarDias } from '@posto/utils';
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
   // `?aba=receitas-despesas` abre direto na aba pedida (a tela de Compras usa
   // isso para "Lançar despesas"). Só o estado inicial: a navegação por abas
   // continua local e não reescreve a URL.
   const [searchParams] = useSearchParams();
   const [activeTab, setActiveTab] = useState<AbaFechamento>(
      () => abaFechamentoDe(searchParams.get('aba')) ?? 'leituras'
   );
   const [observacoes] = useState<string>('');

   // --- Hooks de Dados e Lógica (Refatorados) ---
   const { bicos, frentistas, carregando: loadingDados, carregarDados, updateBicoPrice } = useCarregamentoDados(postoAtivoId, selectedDate);

   const { custoMedioPorProduto, despesaOperacionalLitro, erro: erroDoCusto } = useCustoMensal(postoAtivoId, selectedDate, bicos);

   const {
      leituras, carregando: loadingLeituras, carregarLeituras,
      alterarInicial, alterarFechamento, aoSairInicial, aoSairFechamento, calcLitros
   } = useLeituras(postoAtivoId, selectedDate, bicos, updateBicoPrice);

   const {
      sessoes: frentistaSessions, carregando: loadingSessoes,
      carregarSessoes, alterarCampoFrentista, aoSairCampoFrentista, definirSessoes, removerFrentista, frentistasRemovidosEm
   } = useSessoesFrentistas(postoAtivoId, frentistas);

   const {
      pagamentos: payments, carregando: loadingPagamentos, carregarPagamentos,
      // Deriva as formas de pagamento das sessões dos frentistas (efeito abaixo). A aba
      // "Fechamento Financeiro", que editava isso à mão, foi removida em 30/08/2026.
      sincronizarComSessoes
   } = usePagamentos(postoAtivoId);

   // --- Tempo real: envios do PWA e leituras por foto. Desligado no modo API (sem sessão do
   // Supabase e sem o realtime do Laravel, que é fatia futura) — ver useTempoRealDoFechamento.
   const tempoReal = useTempoRealDoFechamento({ dataSelecionada: selectedDate, carregarSessoes, carregarLeituras });

   const { totalVendas, totalFrentistas, diferenca, podeFechar } = useFechamento(bicos, leituras, frentistaSessions, payments);

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

   // E aplicado UMA vez por restauração, mesmo não vazio: este efeito redispara toda
   // vez que `carregarSessoes` troca de identidade, o que acontece a cada recarga da
   // lista de frentistas — e ela recarrega em todo evento realtime de `Fechamento`
   // (cada envio do PWA consolida o pai). Sem a trava, um rascunho com valores da
   // abertura da tela voltava por cima das sessões recém-vindas do banco.
   const rascunhoAplicado = React.useRef<typeof rascunhoRestaurado>(null);
   useEffect(() => {
      if (restaurado && !saving && !success) {
         // As leituras dos bicos e os envios do PWA vêm do banco (OCR/PWA + realtime) —
         // nunca só do rascunho local, senão um rascunho antigo trava a tela pra sempre
         // com valores desatualizados (carregarSessoes mescla com o rascunho por baixo:
         // sessões já enviadas vêm do banco, sessões digitadas localmente e ainda não
         // enviadas continuam preservadas).
         carregarLeituras();
         // `.length > 0`, não só a existência: `[]` é verdadeiro em JavaScript, e o
         // rascunho nasce com a lista vazia. Sem o comprimento, este `if` entrava com
         // array vazio e chamava `definirSessoes([])`, apagando o que o realtime tinha
         // acabado de trazer do banco — o envio do frentista aparecia na tela e sumia
         // um instante depois. Medido em 19/08/2026 no navegador do dono:
         // `rascunho_fechamento_diario_v1_1` → `sessoesFrentistas: []`.
         if (rascunhoRestaurado?.sessoesFrentistas?.length && rascunhoAplicado.current !== rascunhoRestaurado) {
            rascunhoAplicado.current = rascunhoRestaurado;
            definirSessoes(rascunhoRestaurado.sessoesFrentistas as SessaoFrentista[]);
         }
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

         <div className="w-full px-2 lg:px-3 py-4 space-y-4">
            {!tempoReal && activeTab === 'leituras' && (
               <AvisoSemTempoReal
                  recarregando={loading}
                  onRecarregar={() => {
                     void carregarLeituras(true);
                     if (selectedDate) {
                        void carregarSessoes(selectedDate, true);
                        void carregarPagamentos(selectedDate, true);
                     }
                  }}
               />
            )}
            {loading && <div className="mb-6"><ProgressIndicator current={50} total={100} label="Sincronizando dados..." /></div>}
            {error && <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30 flex items-center gap-3 animate-shake"><AlertTriangle size={20} className="text-red-400" /><span>{error}</span></div>}
            {success && <div className="p-4 bg-emerald-900/20 text-emerald-200 rounded-xl border border-emerald-500/30 flex items-center gap-3 animate-bounce-subtle"><TrendingUp size={20} className="text-emerald-400" /><span>{success}</span></div>}

            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-0.5">
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
               ) : activeTab === 'detalhamento' ? (
                  <TabDetalhamentoFrentista
                     frentistaSessions={frentistaSessions}
                     frentistas={frentistas}
                     loading={loading}
                     onUpdateCampo={(tempId, campo, valor) => {
                        alterarCampoFrentista(tempId, campo as keyof SessaoFrentista, valor.toString());
                     }}
                     postoId={postoAtivoId}
                     dataSelecionada={selectedDate}
                  />
               ) : activeTab === 'receitas-despesas' ? (
                  // Módulo sem rota no Laravel ainda: no login pela API a aba não chama o Supabase.
                  loginPelaApiLigado() ? <AbaForaDaApi aba="Receitas e Despesas" /> : <PainelReceitasDespesas />
               ) : activeTab === 'fechamento-mensal' ? (
                  <FechamentoMensal isEmbedded={true} />
               ) : (
                  <TabGestaoBicos
                     bicos={bicos}
                     leituras={leituras}
                     custoMedioPorProduto={custoMedioPorProduto}
                     despesaOperacionalLitro={despesaOperacionalLitro}
                     custoIndisponivel={erroDoCusto !== null}
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
         {/* Detalhamento, é preciso voltar à aba Leituras de Bomba. */}
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
               frentistasRemovidos: frentistasRemovidosEm(selectedDate),
               limparAutoSave,
               onSuccess: () => {
                  setSuccess(null);
                  // [19/08] Encadeia o lançamento dia a dia: salvou, a tela avança para o dia
                  // seguinte, e o `useLeituras` (modo criação) já semeia a leitura inicial de
                  // cada bico com a última final anterior à data (`getLastReading` usa
                  // `lt('data', ...)`) — o encerrante final de hoje vira o inicial de amanhã
                  // sem digitação. `somarDias`/`deIsoLocal` para não escorregar um dia na
                  // virada UTC (ver @posto/utils/data-local).
                  const proximoDia = selectedDate ? somarDias(deIsoLocal(selectedDate), 1) : null;
                  if (proximoDia && proximoDia <= hojeIso()) {
                     setSelectedDate(proximoDia);
                     return;
                  }
                  // Dia salvo já é hoje (não há amanhã para lançar): mantém o comportamento
                  // antigo, recarregando o próprio dia.
                  carregarLeituras();
                  if (selectedDate) {
                     carregarSessoes(selectedDate, true);
                     carregarPagamentos(selectedDate, true);
                  }
               }
            })}
         />}
      </div>
   );
};

export default TelaFechamentoDiario;
