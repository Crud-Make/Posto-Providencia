/**
 * Serviço de Bicos
 *
 * @remarks
 * Gerencia operações CRUD de bicos (pontos de abastecimento em cada bomba)
 */

import { supabase, withPostoFilter } from './base';
import type { Bico, Bomba, Combustivel, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const bicoService = {
  /**
   * Lista todos os bicos ativos
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Bico[]>> {
    try {
      const baseQuery = supabase
        .from('Bico')
        .select('*')
        .eq('ativo', true);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('numero');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Bico[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista bicos com detalhes da bomba e combustível
   * @param postoId - ID do posto (opcional)
   */
  async getWithDetails(postoId?: number): Promise<ApiResponse<(Bico & { bomba: Bomba; combustivel: Combustivel })[]>> {
    try {
      const baseQuery = supabase
        .from('Bico')
        .select(`
          *,
          bomba:Bomba(*),
          combustivel:Combustivel(*)
        `)
        .eq('ativo', true);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('numero');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Bico & { bomba: Bomba; combustivel: Combustivel })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo bico
   * @param bico - Dados do bico
   */
  async create(bico: InsertTables<'Bico'>): Promise<ApiResponse<Bico>> {
    try {
      const { data, error } = await supabase
        .from('Bico')
        .insert(bico)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Bico);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um bico existente
   * @param id - ID do bico
   * @param bico - Dados a serem atualizados
   */
  async update(id: number, bico: UpdateTables<'Bico'>): Promise<ApiResponse<Bico>> {
    try {
      const { data, error } = await supabase
        .from('Bico')
        .update(bico)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Bico);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

