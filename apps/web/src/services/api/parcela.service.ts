import { supabase } from '../supabase';
import type { Parcela as ParcelaRow, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 19:05] Alinhando tipos de Parcela com aliases e helpers
type Parcela = ParcelaRow;
type ParcelaInsert = InsertTables<'Parcela'>;
type ParcelaUpdate = UpdateTables<'Parcela'>;

/**
 * Serviço de Parcelas
 * 
 * @remarks
 * Gerencia parcelas de empréstimos concedidos a frentistas
 */
export const parcelaService = {
  /**
   * Cria múltiplas parcelas de uma vez
   * @param parcelas - Array de parcelas para criar
   */
  async bulkCreate(parcelas: ParcelaInsert[]): Promise<ApiResponse<Parcela[]>> {
    try {
      const { data, error } = await supabase
        .from('Parcela')
        .insert(parcelas)
        .select();

      if (error) return createErrorResponse(error.message, 'BULK_INSERT_ERROR');
      return createSuccessResponse(data as Parcela[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma parcela
   * @param id - ID da parcela
   * @param parcela - Dados para atualização
   */
  async update(id: number, parcela: ParcelaUpdate): Promise<ApiResponse<Parcela>> {
    try {
      const { data, error } = await supabase
        .from('Parcela')
        .update(parcela)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Parcela);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca parcelas de um empréstimo
   * @param emprestimoId - ID do empréstimo
   */
  async getByEmprestimo(emprestimoId: number): Promise<ApiResponse<Parcela[]>> {
    try {
      const { data, error } = await supabase
        .from('Parcela')
        .select('*')
        .eq('emprestimo_id', emprestimoId)
        .order('numero_parcela');

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse(data as Parcela[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

