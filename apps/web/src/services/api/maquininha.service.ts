import { supabase } from '../supabase';
import { Maquininha, InsertTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/**
 * Serviço de Maquininhas
 * 
 * @remarks
 * Gerencia maquininhas de cartão (POS) para recebimentos
 */
export const maquininhaService = {
  /**
   * Lista todas as maquininhas ativas
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Maquininha[]>> {
    try {
      let query = supabase
        .from('Maquininha')
        .select('*')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Maquininha[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova maquininha
   * @param maquininha - Dados da maquininha
   */
  async create(maquininha: InsertTables<'Maquininha'>): Promise<ApiResponse<Maquininha>> {
    try {
      const { data, error } = await supabase
        .from('Maquininha')
        .insert(maquininha)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Maquininha);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

