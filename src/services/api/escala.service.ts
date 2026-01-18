import { supabase } from '../supabase';
import type { Escala as EscalaBase, Frentista } from '../../types/database/aliases';
import type { WithRelations } from '../../types/ui/helpers';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 16:05] Alinhando Escala com tipos do Supabase e relacionamentos
export type Escala = WithRelations<
  EscalaBase,
  {
    Frentista?: Pick<Frentista, 'nome'>;
  }
>;

/**
 * Serviço de Escalas de Trabalho
 * 
 * @remarks
 * Gerencia escalas de trabalho dos frentistas (dias, turnos, folgas)
 */
export const escalaService = {
  /**
   * Busca todas as escalas
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Escala[]>> {
    try {
      let query = supabase
        .from('Escala')
        .select('*, Frentista(nome)')
        .order('data', { ascending: true });

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao buscar escalas (tabela pode não existir):', error);
        return createSuccessResponse([]);
      }
      return createSuccessResponse((data || []) as Escala[]);
    } catch (err) {
      console.warn('Erro ao buscar escalas:', err);
      return createSuccessResponse([]);
    }
  },

  /**
   * Busca escalas por mês
   * @param month - Mês (1-12)
   * @param year - Ano
   * @param postoId - ID do posto (opcional)
   */
  async getByMonth(month: number, year: number, postoId?: number): Promise<ApiResponse<Escala[]>> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    try {
      let query = supabase
        .from('Escala')
        .select('*, Frentista(nome)')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao buscar escalas por mês (tabela pode não existir):', error);
        return createSuccessResponse([]);
      }
      return createSuccessResponse((data || []) as Escala[]);
    } catch (err) {
      console.warn('Erro ao buscar escalas por mês:', err);
      return createSuccessResponse([]);
    }
  },

  /**
   * Cria uma nova escala
   * @param escala - Dados da escala
   */
  async create(escala: Omit<Escala, 'id' | 'created_at' | 'Frentista'>): Promise<ApiResponse<Escala>> {
    try {
      const { data, error } = await supabase
        .from('Escala')
        .insert(escala)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Escala);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma escala existente
   * @param id - ID da escala
   * @param updates - Dados para atualização
   */
  async update(id: number, updates: Partial<Omit<Escala, 'id' | 'created_at' | 'Frentista'>>): Promise<ApiResponse<Escala>> {
    try {
      const { data, error } = await supabase
        .from('Escala')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Escala);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove uma escala
   * @param id - ID da escala
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from('Escala').delete().eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

