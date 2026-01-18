import { supabase } from '../supabase';
import type { RecebimentoTable, FechamentoTable } from '../../types/database/tables/operacoes';
import type { FormaPagamentoTable, MaquininhaTable } from '../../types/database/tables/pagamentos';
import type { WithRelations } from '../../types/ui/helpers';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 10:45] Refatoração para usar tipos do Supabase e WithRelations
export type Recebimento = RecebimentoTable['Row'];
export type FormaPagamento = FormaPagamentoTable['Row'];
export type Maquininha = MaquininhaTable['Row'];
export type Fechamento = FechamentoTable['Row'];

export type RecebimentoCompleto = WithRelations<
  Recebimento,
  {
    forma_pagamento: FormaPagamento | null;
    maquininha: Maquininha | null;
    fechamento?: Pick<Fechamento, 'data'>;
  }
>;

/**
 * Serviço de Recebimentos
 * 
 * @remarks
 * Gerencia os recebimentos (valores recebidos) de cada forma de pagamento no fechamento
 */
export const recebimentoService = {
  /**
   * Busca todos os recebimentos de um fechamento
   * @param fechamentoId - ID do fechamento
   */
  async getByFechamento(fechamentoId: number): Promise<ApiResponse<RecebimentoCompleto[]>> {
    try {
      const { data, error } = await supabase
        .from('Recebimento')
        .select(`
          *,
          forma_pagamento:FormaPagamento(*),
          maquininha:Maquininha(*)
        `)
        .eq('fechamento_id', fechamentoId);

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse((data || []) as RecebimentoCompleto[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo recebimento
   * @param recebimento - Dados do recebimento
   */
  async create(recebimento: RecebimentoTable['Insert']): Promise<ApiResponse<Recebimento>> {
    try {
      const { data, error } = await supabase
        .from('Recebimento')
        .insert(recebimento)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Recebimento);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria múltiplos recebimentos de uma vez
   * @param recebimentos - Array de recebimentos
   */
  async bulkCreate(recebimentos: RecebimentoTable['Insert'][]): Promise<ApiResponse<Recebimento[]>> {
    try {
      const { data, error } = await supabase
        .from('Recebimento')
        .insert(recebimentos)
        .select();

      if (error) return createErrorResponse(error.message, 'BULK_INSERT_ERROR');
      return createSuccessResponse((data || []) as Recebimento[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove todos os recebimentos de um fechamento
   * @param fechamentoId - ID do fechamento
   */
  async deleteByFechamento(fechamentoId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Recebimento')
        .delete()
        .eq('fechamento_id', fechamentoId);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca recebimentos em um intervalo de datas
   * @param startDate - Data inicial (YYYY-MM-DD)
   * @param endDate - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<ApiResponse<RecebimentoCompleto[]>> {
    try {
      let query = supabase
        .from('Recebimento')
        .select(`
          *,
          forma_pagamento:FormaPagamento(*),
          maquininha:Maquininha(*),
          fechamento:Fechamento!inner(data, posto_id)
        `)
        .gte('fechamento.data', startDate)
        .lte('fechamento.data', endDate);

      if (postoId) {
        query = query.eq('fechamento.posto_id', postoId);
      }

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as RecebimentoCompleto[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

