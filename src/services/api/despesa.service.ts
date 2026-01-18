import { supabase } from '../supabase';
import type { DBDespesa, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 19:05] Alinhando tipos de Despesa com aliases e helpers
type Despesa = DBDespesa;
type DespesaInsert = InsertTables<'Despesa'>;
type DespesaUpdate = UpdateTables<'Despesa'>;

/**
 * Serviço de Despesas
 * 
 * @remarks
 * Gerencia despesas operacionais do posto (energia, aluguel, salários, etc)
 */
export const despesaService = {
  /**
   * Busca todas as despesas
   * @param postoId - ID do posto para filtrar (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Despesa[]>> {
    try {
      let query = supabase
        .from('Despesa')
        .select('*');

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Despesa[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca despesas de um mês específico
   * @param year - Ano
   * @param month - Mês (1-12)
   * @param postoId - ID do posto (opcional)
   */
  async getByMonth(year: number, month: number, postoId?: number): Promise<ApiResponse<Despesa[]>> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    return this.getByDateRange(startDate, endDate, postoId);
  },

  /**
   * Busca despesas por intervalo de datas
   * @param startDate - Data inicial (YYYY-MM-DD)
   * @param endDate - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<ApiResponse<Despesa[]>> {
    try {
      let query = supabase
        .from('Despesa')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Despesa[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova despesa
   * @param despesa - Dados da despesa
   */
  async create(despesa: DespesaInsert): Promise<ApiResponse<Despesa>> {
    try {
      const { data, error } = await supabase
        .from('Despesa')
        .insert(despesa)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Despesa);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma despesa existente
   * @param id - ID da despesa
   * @param despesa - Dados para atualização
   */
  async update(id: number, despesa: DespesaUpdate): Promise<ApiResponse<Despesa>> {
    try {
      const { data, error } = await supabase
        .from('Despesa')
        .update(despesa)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Despesa);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove uma despesa
   * @param id - ID da despesa
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Despesa')
        .delete()
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

