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
    
    // Opcional: Implementar lógica de atualização automática dos pagamentos
    // baseada no somatório dos frentistas, se desejado.
    // Por enquanto, mantemos manual ou via botão de "Sincronizar" se necessário.
    // A lógica original fazia isso automaticamente, podemos reativar:
    /*
    const novosPagamentos = payments.map(p => {
        // ... lógica de mapeamento ...
    });
    // definirPagamentos(novosPagamentos); // Cuidado com loops infinitos!
    */
  }, [frentistasTotals, payments]); // Dependências

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

  if (!user) return <div className="p-8 text-center">Carregando usuário...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
           <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              Fechamento Diário
           </h1>
           
           <div className="flex items-center gap-4">
              {/* Seletores de Contexto */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                 <div className="flex items-center px-3 py-1.5 bg-white rounded shadow-sm border border-gray-200">
                    <Calendar size={16} className="text-gray-500 mr-2" />
                    <input 
                       type="date" 
                       value={selectedDate}
                       onChange={(e) => setSelectedDate(e.target.value)}
                       className="text-sm border-none focus:ring-0 p-0 text-gray-700"
                    />
                 </div>
                 <select 
                    value={selectedTurno || ''}
                    onChange={(e) => setSelectedTurno(Number(e.target.value))}
                    className="text-sm border-none bg-white rounded shadow-sm py-1.5 pl-3 pr-8 focus:ring-0 text-gray-700"
                 >
                    {turnos.map(t => (
                       <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                 </select>
              </div>

              {/* Seleção de Posto */}
              <div className="hidden md:flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                 <MapPin size={16} className="mr-2" />
                 <span className="text-sm font-medium">{postoAtivo?.nome}</span>
              </div>
           </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
           <button 
              onClick={() => setActiveTab('leituras')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                 activeTab === 'leituras' 
                 ? 'border-blue-600 text-blue-600' 
                 : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
           >
              Leituras & Frentistas
           </button>
           <button 
              onClick={() => setActiveTab('financeiro')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                 activeTab === 'financeiro' 
                 ? 'border-blue-600 text-blue-600' 
                 : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
           >
              Financeiro & Resumo
           </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
         {/* Alertas e Loading */}
         {loading && <ProgressIndicator current={50} total={100} label="Carregando dados..." />}
         {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
               <AlertTriangle size={20} />
               {error}
            </div>
         )}
         {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-3">
               <TrendingUp size={20} />
               {success}
            </div>
         )}

         {/* Conteúdo da Aba Leituras */}
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

         {/* Conteúdo da Aba Financeiro */}
         <div className={activeTab === 'financeiro' ? 'block' : 'hidden'}>
            <SecaoPagamentos
               pagamentos={payments}
               onPagamentoChange={(idx, val) => alterarPagamento(idx, val)}
               onPagamentoBlur={(idx) => aoSairPagamento(idx)}
               totalPagamentos={totalPagamentos}
               isLoading={loading}
            />

            <SecaoResumo
               totalLitros={totalLitros}
               totalSessoes={totalFrentistas}
               totalPagamentos={totalPagamentos}
               isLoading={loading}
            />
         </div>
      </div>

      {/* Footer Fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 print:hidden">
         <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <div className="flex gap-8">
               <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Total Vendas (Bomba)</p>
                  <p className="text-xl font-black text-blue-600">
                     {totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Total Apurado (Frentistas)</p>
                  <p className={`text-xl font-black ${diferenca < 0 ? 'text-red-600' : 'text-green-600'}`}>
                     {totalFrentistas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
               </div>
               <div className="hidden md:block">
                  <p className="text-xs text-gray-500 uppercase font-bold">Diferença</p>
                  <p className={`text-xl font-black ${diferenca < 0 ? 'text-red-600' : 'text-green-600'}`}>
                     {diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
               </div>
            </div>

            <div className="flex gap-3">
               <button onClick={handleCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold flex items-center gap-2">
                  <X size={18} /> Cancelar
               </button>
               <button onClick={handlePrint} className="px-4 py-2 border border-gray-300 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-50">
                  <Printer size={18} /> Imprimir
               </button>
               <button 
                  onClick={handleSave} 
                  disabled={saving || !podeFechar}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
