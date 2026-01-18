import { supabase } from '../supabase';
import type { DBDivida } from '../../types/database/aliases';
import type { Divida } from '../../types';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/**
 * Serviço de Dívidas
 * 
 * @remarks
 * Gerencia dívidas do posto (contas a pagar, financiamentos, etc)
 */
export const dividaService = {
  /**
   * Busca todas as dívidas
   * @param postoId - Filtro opcional por posto
   */
  async getAll(postoId?: number): Promise<ApiResponse<Divida[]>> {
    try {
      let query = supabase.from('Divida').select('*');
      if (postoId) query = query.eq('posto_id', postoId);

      const { data, error } = await query.order('data_vencimento', { ascending: true });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      const dividas = (data || []).map((d: DBDivida) => ({
        id: String(d.id),
        descricao: d.descricao,
        valor: Number(d.valor),
        data_vencimento: d.data_vencimento,
        status: d.status,
        posto_id: d.posto_id
      }));

      return createSuccessResponse(dividas);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova dívida
   * @param divida - Dados da dívida (exceto ID)
   */
  async create(divida: Omit<Divida, 'id'>): Promise<ApiResponse<Divida>> {
    try {
      const { data, error } = await supabase
        .from('Divida')
        .insert({
          descricao: divida.descricao,
          valor: divida.valor,
          data_vencimento: divida.data_vencimento,
          status: divida.status,
          posto_id: divida.posto_id
        })
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      return createSuccessResponse({
        id: String(data.id),
        descricao: data.descricao,
        valor: Number(data.valor),
        data_vencimento: data.data_vencimento,
        status: data.status,
        posto_id: data.posto_id
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma dívida existente
   * @param id - ID da dívida
   * @param updates - Dados para atualização
   */
  async update(id: string, updates: Partial<Divida>): Promise<ApiResponse<Divida>> {
    try {
      const { id: _, ...updateData } = updates;

      const { data, error } = await supabase
        .from('Divida')
        .update(updateData)
        .eq('id', Number(id))
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');

      return createSuccessResponse({
        id: String(data.id),
        descricao: data.descricao,
        valor: Number(data.valor),
        data_vencimento: data.data_vencimento,
        status: data.status,
        posto_id: data.posto_id
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove uma dívida
   * @param id - ID da dívida
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Divida')
        .delete()
        .eq('id', Number(id));

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

