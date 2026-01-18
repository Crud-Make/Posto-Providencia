/**
 * Serviço de Postos
 *
 * @remarks
 * Gerencia operações CRUD de postos de gasolina
 */

import { supabase } from './base';
import type { Posto, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const postoService = {
  /**
   * Lista todos os postos ativos
   */
  async getAll(): Promise<ApiResponse<Posto[]>> {
    try {
      const { data, error } = await supabase
        .from('Posto')
        .select('*')
        .eq('ativo', true)
        .order('id');

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse(data as Posto[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca um posto por ID
   * @param id - ID do posto
   */
  async getById(id: number): Promise<ApiResponse<Posto | null>> {
    try {
      const { data, error } = await supabase
        .from('Posto')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as Posto | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca postos vinculados a um usuário
   * @param usuarioId - ID do usuário
   */
  async getByUser(usuarioId: number): Promise<ApiResponse<Posto[]>> {
    try {
      const { data, error } = await supabase
        .from('UsuarioPosto')
        .select(`
          *,
          posto:Posto(*)
        `)
        .eq('usuario_id', usuarioId)
        .eq('ativo', true);

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      type UsuarioPostoComPosto = { posto: Posto | null };
      const typedData = (data || []) as UsuarioPostoComPosto[];
      const postos = typedData.map((up) => up.posto).filter((posto): posto is Posto => Boolean(posto));

      return createSuccessResponse(postos);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista todos os postos incluindo inativos
   */
  async getAllIncludingInactive(): Promise<ApiResponse<Posto[]>> {
    try {
      const { data, error } = await supabase
        .from('Posto')
        .select('*')
        .order('id');

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse(data as Posto[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo posto
   * @param posto - Dados do posto
   */
  async create(posto: Omit<InsertTables<'Posto'>, 'id' | 'created_at'>): Promise<ApiResponse<Posto>> {
    try {
      const { data, error } = await supabase
        .from('Posto')
        .insert(posto)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Posto);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um posto existente
   * @param id - ID do posto
   * @param posto - Dados a serem atualizados
   */
  async update(id: number, posto: UpdateTables<'Posto'>): Promise<ApiResponse<Posto>> {
    try {
      const { data, error } = await supabase
        .from('Posto')
        .update(posto)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Posto);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Desativa um posto (Soft Delete)
   * @param id - ID do posto
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Posto')
        .update({ ativo: false })
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

