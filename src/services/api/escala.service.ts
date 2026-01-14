import { supabase } from '../supabase';
import type { Escala as EscalaBase, Frentista } from '../../types/database/aliases';
import type { WithRelations } from '../../types/ui/helpers';

// [14/01 16:05] Alinhando Escala com tipos do Supabase e relacionamentos
export type Escala = WithRelations<
  EscalaBase,
  {
    Frentista?: Pick<Frentista, 'nome'>;
  }
>;

export const escalaService = {
  /**
   * Busca todas as escalas
   */
  async getAll(postoId?: number): Promise<Escala[]> {
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
        return [];
      }
      return (data || []) as Escala[];
    } catch (error) {
      console.warn('Erro ao buscar escalas:', error);
      return [];
    }
  },

  /**
   * Busca escalas por mês
   */
  async getByMonth(month: number, year: number, postoId?: number): Promise<Escala[]> {
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
        return [];
      }
      return (data || []) as Escala[];
    } catch (error) {
      console.warn('Erro ao buscar escalas por mês:', error);
      return [];
    }
  },

  /**
   * Cria uma nova escala
   */
  async create(escala: Omit<Escala, 'id' | 'created_at' | 'Frentista'>): Promise<Escala> {
    const { data, error } = await supabase
      .from('Escala')
      .insert(escala)
      .select()
      .single();
    if (error) throw error;
    return data as Escala;
  },

  /**
   * Atualiza uma escala existente
   */
  async update(id: number, updates: Partial<Omit<Escala, 'id' | 'created_at' | 'Frentista'>>): Promise<Escala> {
    const { data, error } = await supabase
      .from('Escala')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Escala;
  },

  /**
   * Remove uma escala
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('Escala').delete().eq('id', id);
    if (error) throw error;
  }
};
