/**
 * Serviço de Turnos
 *
 * @remarks
 * Gerencia operações CRUD de turnos de trabalho (Manhã, Tarde, Noite)
 */

import { supabase, withPostoFilter } from './base';
import type { Turno, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const turnoService = {
  /**
   * Lista todos os turnos
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Turno[]>> {
    try {
      const baseQuery = supabase
        .from('Turno')
        .select('*');

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('horario_inicio');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Turno[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo turno
   * @param turno - Dados do turno
   */
  async create(turno: InsertTables<'Turno'>): Promise<ApiResponse<Turno>> {
    try {
      const { data, error } = await supabase
        .from('Turno')
        .insert(turno)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Turno);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um turno existente
   * @param id - ID do turno
   * @param turno - Dados a serem atualizados
   */
  async update(id: number, turno: UpdateTables<'Turno'>): Promise<ApiResponse<Turno>> {
    try {
      const { data, error } = await supabase
        .from('Turno')
        .update(turno)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Turno);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

