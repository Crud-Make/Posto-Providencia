import { supabase } from '../supabase';
import type { Parcela as ParcelaRow, InsertTables, UpdateTables } from '../../types/database/index';

// [14/01 19:05] Alinhando tipos de Parcela com aliases e helpers
type Parcela = ParcelaRow;
type ParcelaInsert = InsertTables<'Parcela'>;
type ParcelaUpdate = UpdateTables<'Parcela'>;

/**
 * Serviço para gerenciamento de Parcelas de empréstimos.
 */
export const parcelaService = {
  /**
   * Cria múltiplas parcelas de uma vez.
   * @param parcelas Array de parcelas para criar
   * @returns Lista de parcelas criadas
   */
  async bulkCreate(parcelas: ParcelaInsert[]): Promise<Parcela[]> {
    const { data, error } = await supabase
      .from('Parcela')
      .insert(parcelas)
      .select();
    if (error) throw error;
    return data || [];
  },

  /**
   * Atualiza uma parcela.
   * @param id ID da parcela
   * @param parcela Dados para atualização
   * @returns Parcela atualizada
   */
  async update(id: number, parcela: ParcelaUpdate): Promise<Parcela> {
    const { data, error } = await supabase
      .from('Parcela')
      .update(parcela)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Busca parcelas de um empréstimo específico.
   * @param emprestimoId ID do empréstimo
   * @returns Lista de parcelas ordenadas por número
   */
  async getByEmprestimo(emprestimoId: number): Promise<Parcela[]> {
    const { data, error } = await supabase
      .from('Parcela')
      .select('*')
      .eq('emprestimo_id', emprestimoId)
      .order('numero_parcela');
    if (error) throw error;
    return data || [];
  }
};
