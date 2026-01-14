import { supabase } from '../supabase';
import type { DBDespesa, InsertTables, UpdateTables } from '../../types/database/index';

// [14/01 19:05] Alinhando tipos de Despesa com aliases e helpers
type Despesa = DBDespesa;
type DespesaInsert = InsertTables<'Despesa'>;
type DespesaUpdate = UpdateTables<'Despesa'>;

/**
 * Serviço para gerenciamento de Despesas.
 */
export const despesaService = {
  /**
   * Busca todas as despesas, opcionalmente filtrando por posto.
   * @param postoId ID do posto para filtrar (opcional)
   * @returns Lista de despesas ordenadas por data decrescente
   */
  async getAll(postoId?: number): Promise<Despesa[]> {
    let query = supabase
      .from('Despesa')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Busca despesas de um mês específico.
   * @param year Ano
   * @param month Mês (1-12)
   * @param postoId ID do posto para filtrar (opcional)
   * @returns Lista de despesas do mês
   */
  async getByMonth(year: number, month: number, postoId?: number): Promise<Despesa[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    return this.getByDateRange(startDate, endDate, postoId);
  },

  /**
   * Busca despesas por intervalo de datas.
   * @param startDate Data inicial (YYYY-MM-DD)
   * @param endDate Data final (YYYY-MM-DD)
   * @param postoId ID do posto (opcional)
   * @returns Lista de despesas do período
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<Despesa[]> {
    let query = supabase
      .from('Despesa')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar despesas:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Cria uma nova despesa.
   * @param despesa Dados da despesa
   * @returns Despesa criada
   */
  async create(despesa: DespesaInsert): Promise<Despesa> {
    const { data, error } = await supabase
      .from('Despesa')
      .insert(despesa)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Atualiza uma despesa existente.
   * @param id ID da despesa
   * @param despesa Dados para atualização
   * @returns Despesa atualizada
   */
  async update(id: number, despesa: DespesaUpdate): Promise<Despesa> {
    const { data, error } = await supabase
      .from('Despesa')
      .update(despesa)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Remove uma despesa.
   * @param id ID da despesa
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('Despesa')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
