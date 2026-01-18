import { supabase } from '../supabase';
import { FormaPagamento, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/**
 * Serviço de Formas de Pagamento
 * 
 * @remarks
 * Gerencia as formas de pagamento aceitas (Dinheiro, Débito, Crédito, PIX, etc)
 */
export const formaPagamentoService = {
  /**
   * Lista todas as formas de pagamento ativas
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<FormaPagamento[]>> {
    try {
      let query = supabase
        .from('FormaPagamento')
        .select('*')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as FormaPagamento[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova forma de pagamento
   * @param forma - Dados da forma de pagamento
   */
  async create(forma: InsertTables<'FormaPagamento'>): Promise<ApiResponse<FormaPagamento>> {
    try {
      const { data, error } = await supabase
        .from('FormaPagamento')
        .insert(forma)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as FormaPagamento);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma forma de pagamento
   * @param id - ID da forma de pagamento
   * @param forma - Dados a serem atualizados
   */
  async update(id: number, forma: UpdateTables<'FormaPagamento'>): Promise<ApiResponse<FormaPagamento>> {
    try {
      const { data, error } = await supabase
        .from('FormaPagamento')
        .update(forma)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as FormaPagamento);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Desativa uma forma de pagamento (Soft Delete)
   * @param id - ID da forma de pagamento
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('FormaPagamento')
        .update({ ativo: false })
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

