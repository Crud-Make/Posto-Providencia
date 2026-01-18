import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePosto } from '../../../contexts/PostoContext';
import {
   fechamentoService,
   leituraService,
   fechamentoFrentistaService,
   recebimentoService
} from '../../../services/api';
import { parseValue } from '../../../utils/formatters';
import { isSuccess } from '../../../types/ui/response-types';
import type { BicoComDetalhes, SessaoFrentista, EntradaPagamento } from '../../../types/fechamento';

interface SubmissaoParams {
   selectedDate: string;
   selectedTurno: number | null;
   bicos: BicoComDetalhes[];
   leituras: Record<number, { inicial: string; fechamento: string }>;
   sessoesFrentistas: SessaoFrentista[];
   payments: EntradaPagamento[];
   totalVendas: number;
   totalFrentistas: number;
   diferenca: number;
   podeFechar: boolean;
   observacoes: string;
   limparAutoSave: () => void;
}

/**
 * Hook para gerenciar a lógica complexa de submissão do fechamento diário.
 * 
 * @returns { saving, error, success, handleSave }
 */
export function useSubmissaoFechamento() {
   const { user } = useAuth();
   const { postoAtivoId } = usePosto();
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   /**
    * Executa a persistência de todos os dados do fechamento.
    */
   const handleSave = async (params: SubmissaoParams) => {
      const {
         selectedDate,
         selectedTurno,
         bicos,
         leituras,
         sessoesFrentistas,
         payments,
         totalVendas,
         totalFrentistas,
         diferenca,
         podeFechar,
         observacoes,
         limparAutoSave
      } = params;

      if (!user) {
         setError('Usuário não autenticado.');
         return;
      }

      if (!postoAtivoId) {
         setError('Posto não selecionado.');
         return;
      }

      if (!selectedTurno) {
         setError('Turno não selecionado.');
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
         const fechamentoRes = await fechamentoService.getByDateAndTurno(selectedDate, selectedTurno, postoAtivoId);

         let fechamento;
         if (isSuccess(fechamentoRes) && fechamentoRes.data) {
            fechamento = fechamentoRes.data;
            // Limpar dados antigos para sobrescrever
            await Promise.all([
               leituraService.deleteByShift(selectedDate, selectedTurno, postoAtivoId),
               fechamentoFrentistaService.deleteByFechamento(fechamento.id),
               recebimentoService.deleteByFechamento(fechamento.id)
            ]);
         } else {
            const createRes = await fechamentoService.create({
               data: selectedDate,
               usuario_id: user.id,
               turno_id: selectedTurno,
               status: 'RASCUNHO',
               posto_id: postoAtivoId
            });

            if (!isSuccess(createRes)) {
               throw new Error(createRes.error || 'Erro ao criar fechamento');
            }
            fechamento = createRes.data;
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
               turno_id: selectedTurno,
               posto_id: postoAtivoId
            }));

         if (leiturasToCreate.length > 0) {
            const leiturasRes = await leituraService.bulkCreate(leiturasToCreate);
            if (!isSuccess(leiturasRes)) {
               throw new Error(leiturasRes.error || 'Erro ao salvar leituras');
            }
         }

         // 3. Salvar Sessões de Frentistas
         if (sessoesFrentistas.length > 0) {
            const frentistasToCreate = sessoesFrentistas
               .filter(fs => fs.frentistaId !== null)
               .map(fs => {
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
                     fechamento_id: fechamento.id,
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
               const sessoesRes = await fechamentoFrentistaService.bulkCreate(frentistasToCreate);
               if (!isSuccess(sessoesRes)) {
                  throw new Error(sessoesRes.error || 'Erro ao salvar sessões de frentistas');
               }
            }
         }

         // 4. Salvar Pagamentos (Recebimentos)
         const recebimentosToCreate = payments
            .filter(p => parseValue(p.valor) > 0)
            .map(p => ({
               fechamento_id: fechamento.id,
               forma_pagamento_id: p.id,
               valor: parseValue(p.valor),
               observacoes: 'Fechamento Geral'
            }));

         if (recebimentosToCreate.length > 0) {
            const recebimentosRes = await recebimentoService.bulkCreate(recebimentosToCreate);
            if (!isSuccess(recebimentosRes)) {
               throw new Error(recebimentosRes.error || 'Erro ao salvar pagamentos');
            }
         }

         // 5. Atualizar Status do Fechamento
         const updateRes = await fechamentoService.update(fechamento.id, {
            status: 'FECHADO',
            total_vendas: totalVendas,
            total_recebido: totalFrentistas,
            diferenca: diferenca,
            observacoes: observacoes
         });

         if (!isSuccess(updateRes)) {
            throw new Error(updateRes.error || 'Erro ao finalizar fechamento');
         }

         setSuccess('Fechamento realizado com sucesso!');
         limparAutoSave();

         // Recarrega a página após sucesso
         setTimeout(() => {
            window.location.reload();
         }, 1500);

      } catch (err: unknown) {
         console.error('❌ Erro na submissão:', err);
         setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar fechamento');
      } finally {
         setSaving(false);
      }
   };

   return {
      saving,
      error,
      success,
      handleSave,
      setError,
      setSuccess
   };
}
