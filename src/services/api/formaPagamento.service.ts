import { supabase } from '../supabase';
import { FormaPagamento, InsertTables, UpdateTables } from '../../types/database/index';

export const formaPagamentoService = {
  async getAll(postoId?: number): Promise<FormaPagamento[]> {
    let query = supabase
      .from('FormaPagamento')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(forma: InsertTables<'FormaPagamento'>): Promise<FormaPagamento> {
    const { data, error } = await supabase
      .from('FormaPagamento')
      .insert(forma)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, forma: UpdateTables<'FormaPagamento'>): Promise<FormaPagamento> {
    const { data, error } = await supabase
      .from('FormaPagamento')
      .update(forma)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('FormaPagamento')
      .update({ ativo: false }) // Soft delete
      .eq('id', id);
    if (error) throw error;
  },
};
