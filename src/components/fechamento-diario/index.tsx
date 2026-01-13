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
   Loader2,
   TrendingUp,
   AlertTriangle
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { usePosto } from '../../contexts/PostoContext';
import { useCarregamentoDados } from './hooks/useCarregamentoDados';
import { useLeituras } from './hooks/useLeituras';
import { useSessoesFrentistas } from './hooks/useSessoesFrentistas';
import { usePagamentos } from './hooks/usePagamentos';
import { useFechamento } from './hooks/useFechamento';
import { useAutoSave } from './hooks/useAutoSave';
import type { SessaoFrentista } from '../../types/fechamento';

import {
   fechamentoService,
   leituraService,
   fechamentoFrentistaService,
   recebimentoService
} from '../../services/api';
import { parseValue } from '../../utils/formatters';

// Subcomponentes
import { HeaderFechamento } from './components/HeaderFechamento';
import { TabelaLeituras } from './components/TabelaLeituras';
import { SecaoSessoesFrentistas } from './components/TabelaFrentistas';
import { SecaoPagamentos } from './components/PainelFinanceiro';
import { SecaoResumo } from './components/ResumoCombustivel';
import { FooterAcoes } from './components/FooterAcoes';
import { ProgressIndicator } from '../common/ValidationAlert';

const TelaFechamentoDiario: React.FC = () => {
   const { user } = useAuth();
   const { postoAtivoId, postoAtivo } = usePosto();

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
   const [observacoes] = useState<string>('');

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
      definirLeituras
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
      aoSairPagamento
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
            if (rascunhoRestaurado.sessoesFrentistas) definirSessoes(rascunhoRestaurado.sessoesFrentistas as SessaoFrentista[]);
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

      } catch (err: unknown) {
         console.error(err);
         setError('Erro ao salvar fechamento: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      } finally {
         setSaving(false);
      }
   };

   // --- Render ---

   if (!user) return <div className="p-8 text-center text-slate-300">Carregando usuário...</div>;

   return (
      <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans selection:bg-blue-500/30">
         <HeaderFechamento
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTurno={selectedTurno}
            setSelectedTurno={setSelectedTurno}
            turnos={turnos}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            postoNome={postoAtivo?.nome}
            loading={loadingDados}
         />

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
                  <TabelaLeituras
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

         <FooterAcoes
            totalVendas={totalVendas}
            totalFrentistas={totalFrentistas}
            diferenca={diferenca}
            saving={saving}
            podeFechar={podeFechar}
            handleSave={handleSave}
         />
      </div>
   );
};

export default TelaFechamentoDiario;
