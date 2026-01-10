import { supabase } from '../supabase';
import { Maquininha, InsertTables } from '../../types/database/index';

export const maquininhaService = {
  async getAll(postoId?: number): Promise<Maquininha[]> {
    let query = supabase
      .from('Maquininha')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(maquininha: InsertTables<'Maquininha'>): Promise<Maquininha> {
    const { data, error } = await supabase
      .from('Maquininha')
      .insert(maquininha)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
