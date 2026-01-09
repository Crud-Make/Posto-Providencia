/**
 * Tela de Fechamento de Caixa Diário
 *
 * @remarks
 * Componente principal para o processo de fechamento de caixa.
 * Gerencia leituras de bicos, frentistas, pagamentos e conferência.
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 2.0.0
 */

// [09/01 09:30] Refatoração completa para uso de hooks customizados e arquitetura modular
// Motivo: Melhorar manutenibilidade, performance e separar lógica de negócio da UI.

import React, { useState, useEffect } from 'react';
import {
   Save as SaveIcon,
   X,
   Printer,
   Loader2,
   Calendar,
   Clock,
   MapPin,
   TrendingUp,
   AlertTriangle
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { usePosto } from '../contexts/PostoContext';
import { useCarregamentoDados } from '../hooks/useCarregamentoDados';
import { useLeituras } from '../hooks/useLeituras';
import { useSessoesFrentistas } from '../hooks/useSessoesFrentistas';
import { usePagamentos } from '../hooks/usePagamentos';
import { useFechamento } from '../hooks/useFechamento';
import { useAutoSave } from '../hooks/useAutoSave';

import {
   fechamentoService,
   leituraService,
   fechamentoFrentistaService,
   recebimentoService,
   notificationService
} from '../services/api';
import { parseValue } from '../utils/formatters'; // Import from utils

import { SecaoLeituras } from './fechamento/SecaoLeituras';
import { SecaoSessoesFrentistas } from './fechamento/SecaoSessoesFrentistas';
import { SecaoPagamentos } from './fechamento/SecaoPagamentos';
import { SecaoResumo } from './fechamento/SecaoResumo';
import { DifferenceAlert, ProgressIndicator } from './ValidationAlert';

const TelaFechamentoDiario: React.FC = () => {
   const { user } = useAuth();
   const { postoAtivoId, postos, setPostoAtivoById, postoAtivo } = usePosto();

   // --- Hooks de Dados e Lógica de Negócio (Refatorado) ---

   // 1. Carregamento de Dados Básicos (Bicos, Frentistas, Turnos)
   const {
      bicos,
      frentistas,
      turnos,
      carregando: loadingDados,
      carregarDados
   } = useCarregamentoDados(postoAtivoId);

   // Estado local para seleção de contexto
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [selectedTurno, setSelectedTurno] = useState<number | null>(null);
   const [activeTab, setActiveTab] = useState<'leituras' | 'financeiro'>('leituras');
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);
   const [observacoes, setObservacoes] = useState<string>('');

   // 2. Leituras dos Bicos
   const {
      leituras,
      carregando: loadingLeituras,
      carregarLeituras,
      alterarInicial,
      alterarFechamento,
      aoSairInicial,
      aoSairFechamento,
      calcLitros,
      definirLeituras,
      totals: totaisLeituras
   } = useLeituras(postoAtivoId, selectedDate, selectedTurno, bicos);

   // 3. Sessões de Frentistas
   const {
      sessoes: frentistaSessions,
      carregando: loadingSessoes,
      totais: frentistasTotals,
      carregarSessoes,
      adicionarFrentista,
      removerFrentista,
      alterarCampoFrentista,
      aoSairCampoFrentista,
      definirSessoes
   } = useSessoesFrentistas(postoAtivoId);

   // 4. Pagamentos (Caixa Geral)
   const {
      pagamentos: payments,
      carregando: loadingPagamentos,
      totalPagamentos,
      carregarPagamentos,
      alterarPagamento,
      aoSairPagamento,
      definirPagamentos
   } = usePagamentos(postoAtivoId);

   // 5. Fechamento (Cálculos e Validação)
   const {
      totalLitros,
      totalVendas, // Valor total das vendas na bomba (R$)
      totalFrentistas, // Valor total declarado pelos frentistas (R$)
      diferenca, // Diferença entre Frentistas e Vendas (Quebra de Caixa)
      podeFechar
   } = useFechamento(bicos, leituras, frentistaSessions, payments);

   // 6. AutoSave
   const loading = loadingDados || loadingLeituras || loadingSessoes || loadingPagamentos;

   const { restaurado, rascunhoRestaurado, limparAutoSave } = useAutoSave({
      postoId: postoAtivoId,
      dataSelecionada: selectedDate,
      turnoSelecionado: selectedTurno,
      leituras,
      sessoesFrentistas: frentistaSessions,
      carregando: loading,
      salvando: saving
   });

   // --- Efeitos ---

   // Carrega dados iniciais e pagamentos ao montar ou mudar posto
   useEffect(() => {
      if (postoAtivoId) {
         carregarDados();
         carregarPagamentos();
      }
   }, [postoAtivoId, carregarDados, carregarPagamentos]);

   // Seleciona turno padrão
   useEffect(() => {
      if (turnos.length > 0 && !selectedTurno) {
         const diario = turnos.find(t => t.nome.toLowerCase().includes('diário') || t.nome.toLowerCase().includes('diario'));
         setSelectedTurno(diario ? diario.id : turnos[0].id);
      }
   }, [turnos, selectedTurno]);

   // Restaura Rascunho ou Carrega Dados do Banco
   useEffect(() => {
      if (restaurado) {
         if (rascunhoRestaurado) {
            console.log('📦 Aplicando rascunho restaurado...');
            if (rascunhoRestaurado.leituras) definirLeituras(rascunhoRestaurado.leituras);
            if (rascunhoRestaurado.sessoesFrentistas) definirSessoes(rascunhoRestaurado.sessoesFrentistas as any);
            if (rascunhoRestaurado.turnoSelecionado) setSelectedTurno(rascunhoRestaurado.turnoSelecionado);
         } else {
            // Se não tem rascunho, carrega do banco
            carregarLeituras();
            if (selectedDate && selectedTurno) {
               carregarSessoes(selectedDate, selectedTurno);
            }
         }
      }
   }, [restaurado, rascunhoRestaurado, carregarLeituras, definirLeituras, carregarSessoes, definirSessoes, selectedDate, selectedTurno]);

   // Recarrega sessões e leituras quando contexto muda (se não estiver restaurando)
   useEffect(() => {
      if (selectedDate && selectedTurno && restaurado && !rascunhoRestaurado) {
         carregarLeituras();
         carregarSessoes(selectedDate, selectedTurno);
      }
   }, [selectedDate, selectedTurno, restaurado, rascunhoRestaurado, carregarLeituras, carregarSessoes]);

   // Sincroniza Pagamentos com Totais dos Frentistas (Push Strategy)
   useEffect(() => {
      if (!frentistasTotals || !payments.length) return;
   }, [frentistasTotals, payments]);

   // --- Handlers ---

   const handleCancel = () => {
      if (window.confirm('Tem certeza que deseja cancelar? Todas as alterações não salvas serão perdidas.')) {
         window.location.reload();
      }
   };

   const handlePrint = () => {
      window.print();
   };

   const handleSave = async () => {
      if (!user) {
         setError('Usuário não autenticado.');
         return;
      }

      if (!podeFechar) {
         setError('Verifique os dados antes de salvar (Leituras inválidas ou Frentistas vazios).');
         return;
      }

      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         // 1. Obter ou Criar Fechamento
         let fechamento = await fechamentoService.getByDateAndTurno(selectedDate, selectedTurno!, postoAtivoId);

         if (!fechamento) {
            fechamento = await fechamentoService.create({
               data: selectedDate,
               usuario_id: user.id,
               turno_id: selectedTurno!,
               status: 'RASCUNHO',
               posto_id: postoAtivoId
            });
         } else {
            // Limpar dados antigos para sobrescrever
            await Promise.all([
               leituraService.deleteByShift(selectedDate, selectedTurno!, postoAtivoId),
               fechamentoFrentistaService.deleteByFechamento(fechamento.id),
               recebimentoService.deleteByFechamento(fechamento.id)
            ]);
         }

         // 2. Salvar Leituras
         const leiturasToCreate = bicos
            .filter(b => leituras[b.id] && leituras[b.id].fechamento)
            .map(bico => ({
               bico_id: bico.id,
               data: selectedDate,
               leitura_inicial: parseValue(leituras[bico.id]?.inicial || ''),
               leitura_final: parseValue(leituras[bico.id]?.fechamento || ''),
               combustivel_id: bico.combustivel.id,
               preco_litro: bico.combustivel.preco_venda,
               usuario_id: user.id,
               turno_id: selectedTurno!,
               posto_id: postoAtivoId
            }));

         if (leiturasToCreate.length > 0) {
            await leituraService.bulkCreate(leiturasToCreate);
         }

         // 3. Salvar Sessões de Frentistas
         if (frentistaSessions.length > 0) {
            const frentistasToCreate = frentistaSessions
               .filter(fs => fs.frentistaId !== null)
               .map(fs => {
                  // Recalcula totais para garantir consistência
                  const totalInformado =
                     parseValue(fs.valor_cartao_debito) +
                     parseValue(fs.valor_cartao_credito) +
                     parseValue(fs.valor_nota) +
                     parseValue(fs.valor_pix) +
                     parseValue(fs.valor_dinheiro) +
                     parseValue(fs.valor_baratao);

                  const totalVendido = parseValue(fs.valor_encerrante);
                  const diferencaCalc = totalVendido > 0 ? (totalVendido - totalInformado) : 0;
                  const valorConf = totalVendido > 0 ? totalVendido : (parseValue(fs.valor_conferido) || totalInformado);

                  return {
                     fechamento_id: fechamento!.id,
                     frentista_id: fs.frentistaId!,
                     valor_cartao: parseValue(fs.valor_cartao_debito) + parseValue(fs.valor_cartao_credito),
                     valor_cartao_debito: parseValue(fs.valor_cartao_debito),
                     valor_cartao_credito: parseValue(fs.valor_cartao_credito),
                     valor_dinheiro: parseValue(fs.valor_dinheiro),
                     valor_pix: parseValue(fs.valor_pix),
                     valor_nota: parseValue(fs.valor_nota),
                     baratao: parseValue(fs.valor_baratao),
                     encerrante: totalVendido,
                     diferenca_calculada: diferencaCalc,
                     valor_conferido: valorConf,
                     observacoes: fs.observacoes || '',
                     posto_id: postoAtivoId
                  };
               });

            if (frentistasToCreate.length > 0) {
               await fechamentoFrentistaService.bulkCreate(frentistasToCreate);
            }
         }

         // 4. Salvar Pagamentos (Caixa Geral)
         const recebimentosToCreate = payments
            .filter(p => parseValue(p.valor) > 0)
            .map(p => ({
               fechamento_id: fechamento!.id,
               forma_pagamento_id: p.id,
               valor: parseValue(p.valor),
               observacoes: 'Fechamento Geral'
            }));

         if (recebimentosToCreate.length > 0) {
            await recebimentoService.bulkCreate(recebimentosToCreate);
         }

         // 5. Atualizar Status do Fechamento
         await fechamentoService.update(fechamento!.id, {
            status: 'FECHADO',
            total_vendas: totalVendas,
            total_recebido: totalFrentistas, // Usamos o total dos frentistas como o "Realizado"
            diferenca: diferenca,
            observacoes: observacoes
         });

         setSuccess('Fechamento realizado com sucesso!');
         limparAutoSave();

         setTimeout(() => {
            window.location.reload();
         }, 1500);

      } catch (err: any) {
         console.error(err);
         setError('Erro ao salvar fechamento: ' + (err.message || 'Erro desconhecido'));
      } finally {
         setSaving(false);
      }
   };

   // --- Render ---

   if (!user) return <div className="p-8 text-center text-slate-300">Carregando usuário...</div>;

   return (
      <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans selection:bg-blue-500/30">
         {/* Header - Glassmorphism Style */}
         <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-30 transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
               <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                     <div className="p-2 bg-blue-600/20 rounded-lg">
                        <TrendingUp className="text-blue-400" size={24} />
                     </div>
                     Fechamento de Caixa
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 ml-1">
                     Insira as leituras para calcular as vendas do dia.
                  </p>
               </div>

               <div className="flex items-center gap-4">
                  {/* Seletores de Contexto Modernizados */}
                  <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                     <div className="flex items-center px-4 py-2 bg-slate-800 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors group cursor-pointer">
                        <Calendar size={16} className="text-blue-400 mr-3 group-hover:text-blue-300" />
                        <input
                           type="date"
                           value={selectedDate}
                           onChange={(e) => setSelectedDate(e.target.value)}
                           className="text-sm bg-transparent border-none focus:ring-0 p-0 text-slate-200 cursor-pointer font-medium"
                        />
                     </div>
                     <select
                        value={selectedTurno || ''}
                        onChange={(e) => setSelectedTurno(Number(e.target.value))}
                        className="text-sm bg-slate-800 border-slate-600/50 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500/50 text-slate-200 font-medium cursor-pointer hover:bg-slate-700 transition-colors"
                     >
                        {turnos.map(t => (
                           <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                     </select>
                  </div>

                  {/* Botão de Ajuda / Posto */}
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                     <MapPin size={16} className="mr-2 text-emerald-400" />
                     <span className="text-sm font-semibold tracking-wide">{postoAtivo?.nome}</span>
                  </div>
               </div>
            </div>

            {/* Tabs - Estilo Pill Navigation */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 mt-2 pb-0">
               <button
                  onClick={() => setActiveTab('leituras')}
                  className={`flex-1 md:flex-none px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${activeTab === 'leituras'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                     }`}
               >
                  ⛽ Leituras de Bomba
               </button>
               <button
                  onClick={() => setActiveTab('financeiro')}
                  className={`flex-1 md:flex-none px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${activeTab === 'financeiro'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                     }`}
               >
                  💰 Fechamento Financeiro
               </button>
            </div>
         </div>

         <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Alertas e Loading */}
            {loading && (
               <div className="mb-6">
                  <ProgressIndicator current={50} total={100} label="Sincronizando dados..." />
               </div>
            )}

            {error && (
               <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30 flex items-center gap-3 animate-shake">
                  <AlertTriangle size={20} className="text-red-400" />
                  <span className="font-medium">{error}</span>
               </div>
            )}
            {success && (
               <div className="p-4 bg-emerald-900/20 text-emerald-200 rounded-xl border border-emerald-500/30 flex items-center gap-3 animate-bounce-subtle">
                  <TrendingUp size={20} className="text-emerald-400" />
                  <span className="font-medium">{success}</span>
               </div>
            )}

            {/* Conteúdo das Abas */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-1">
               <div className={activeTab === 'leituras' ? 'block' : 'hidden'}>
                  <SecaoLeituras
                     bicos={bicos}
                     leituras={leituras}
                     onLeituraInicialChange={alterarInicial}
                     onLeituraFechamentoChange={alterarFechamento}
                     onLeituraInicialBlur={aoSairInicial}
                     onLeituraFechamentoBlur={aoSairFechamento}
                     calcLitros={calcLitros}
                     isLoading={loading}
                  />

                  <div className="mt-8 border-t border-slate-700/50 pt-8">
                     <SecaoSessoesFrentistas
                        sessoes={frentistaSessions}
                        frentistas={frentistas}
                        onSessaoChange={alterarCampoFrentista}
                        onSessaoBlur={aoSairCampoFrentista}
                        onRemoverSessao={removerFrentista}
                        onAdicionarSessao={adicionarFrentista}
                        isLoading={loading}
                     />
                  </div>
               </div>

               <div className={activeTab === 'financeiro' ? 'block' : 'hidden'}>
                  <SecaoPagamentos
                     pagamentos={payments}
                     onPagamentoChange={(idx, val) => alterarPagamento(idx, val)}
                     onPagamentoBlur={(idx) => aoSairPagamento(idx)}
                     totalPagamentos={totalPagamentos}
                     isLoading={loading}
                  />

                  <div className="mt-8">
                     <SecaoResumo
                        totalLitros={totalLitros}
                        totalSessoes={totalFrentistas}
                        totalPagamentos={totalPagamentos}
                        leituras={leituras}
                        bicos={bicos}
                        sessoes={frentistaSessions}
                        frentistas={frentistas}
                        isLoading={loading}
                     />
                  </div>
               </div>
            </div>
         </div>

         {/* Footer Fixo - Modern Dashboard Style */}
         <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 p-4 shadow-2xl z-40 print:hidden text-white">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
               <div className="flex gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                  <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vendas (Bomba)</p>
                     <p className="text-xl font-bold text-blue-400 font-mono">
                        {totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </p>
                  </div>
                  <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Apurado (Frentistas)</p>
                     <p className={`text-xl font-bold font-mono ${diferenca < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {totalFrentistas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </p>
                  </div>
                  <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 border-l-4 border-l-orange-500/50">
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Diferença</p>
                     <p className={`text-xl font-bold font-mono ${diferenca < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                     </p>
                  </div>
               </div>

               <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={handleCancel} className="flex-1 md:flex-none px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all">
                     <X size={18} /> Cancelar
                  </button>
                  <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all">
                     <Printer size={18} /> Imprimir
                  </button>
                  <button
                     onClick={handleSave}
                     disabled={saving || !podeFechar}
                     className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                     {saving ? <Loader2 size={18} className="animate-spin" /> : <SaveIcon size={18} />}
                     Salvar Fechamento
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default TelaFechamentoDiario;
