/**
 * Serviço de Bombas
 *
 * @remarks
 * Gerencia operações CRUD de bombas de combustível
 */

import { supabase, withPostoFilter } from './base';
import type { Bomba, Bico, Combustivel, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const bombaService = {
  /**
   * Lista todas as bombas ativas
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Bomba[]>> {
    try {
      const baseQuery = supabase
        .from('Bomba')
        .select('*')
        .eq('ativo', true);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Bomba[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista bombas com seus bicos e combustíveis associados
   * @param postoId - ID do posto (opcional)
   */
  async getWithBicos(postoId?: number): Promise<ApiResponse<(Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[]>> {
    try {
      const baseQuery = supabase
        .from('Bomba')
        .select(`
          *,
          bicos:Bico(
            *,
            combustivel:Combustivel(*)
          )
        `)
        .eq('ativo', true);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova bomba
   * @param bomba - Dados da bomba
   */
  async create(bomba: InsertTables<'Bomba'>): Promise<ApiResponse<Bomba>> {
    try {
      const { data, error } = await supabase
        .from('Bomba')
        .insert(bomba)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Bomba);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma bomba existente
   * @param id - ID da bomba
   * @param bomba - Dados a serem atualizados
   */
  async update(id: number, bomba: UpdateTables<'Bomba'>): Promise<ApiResponse<Bomba>> {
    try {
      const { data, error } = await supabase
        .from('Bomba')
        .update(bomba)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Bomba);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

