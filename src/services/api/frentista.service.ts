/**
 * Serviço de Frentistas
 *
 * @remarks
 * Gerencia operações CRUD de frentistas (funcionários responsáveis pelo abastecimento)
 */

import { supabase, withPostoFilter } from './base';
import type { Frentista, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const frentistaService = {
  /**
   * Busca frentistas com seus emails de login
   * @param postoId - ID do posto (opcional)
   * @remarks Usa RPC para fazer join com a tabela auth.users
   */
  async getWithEmail(postoId?: number): Promise<ApiResponse<(Frentista & { email: string | null })[]>> {
    try {
      const query = supabase.rpc('get_frentistas_with_email');

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      const typedData = (data || []) as (Frentista & { email: string | null })[];

      if (postoId) {
        const filtered = typedData.filter((f) => f.posto_id === postoId);
        return createSuccessResponse(filtered);
      }

      return createSuccessResponse(typedData);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista todos os frentistas ativos
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Frentista[]>> {
    try {
      let query = supabase
        .from('Frentista')
        .select('*')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Frentista[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca um frentista por ID
   * @param id - ID do frentista
   */
  async getById(id: number): Promise<ApiResponse<Frentista | null>> {
    try {
      const { data, error } = await supabase
        .from('Frentista')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as Frentista | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo frentista
   * @param frentista - Dados do frentista
   */
  async create(frentista: InsertTables<'Frentista'>): Promise<ApiResponse<Frentista>> {
    try {
      const { data, error } = await supabase
        .from('Frentista')
        .insert(frentista)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Frentista);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza dados de um frentista
   * @param id - ID do frentista
   * @param frentista - Dados a serem atualizados
   */
  async update(id: number, frentista: UpdateTables<'Frentista'>): Promise<ApiResponse<Frentista>> {
    try {
      const { data, error } = await supabase
        .from('Frentista')
        .update(frentista)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Frentista);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Desativa um frentista (Soft Delete)
   * @param id - ID do frentista
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Frentista')
        .update({ ativo: false })
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

