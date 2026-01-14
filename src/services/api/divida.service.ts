import { supabase } from '../supabase';
import type { DBDivida } from '../../types/database/aliases';
import type { Divida } from '../../types';

/**
 * Serviço para gerenciamento de Dívidas.
 */
export const dividaService = {
  /**
   * Busca todas as dívidas.
   * @param postoId Filtro opcional por posto
   * @returns Lista de dívidas
   */
  async getAll(postoId?: number): Promise<Divida[]> {
    let query = supabase.from('Divida').select('*');
    if (postoId) query = query.eq('posto_id', postoId);

    const { data, error } = await query.order('data_vencimento', { ascending: true });
    if (error) throw error;

    return (data || []).map((d: DBDivida) => ({
      id: String(d.id),
      descricao: d.descricao,
      valor: Number(d.valor),
      data_vencimento: d.data_vencimento,
      status: d.status,
      posto_id: d.posto_id
    }));
  },

  /**
   * Cria uma nova dívida.
   * @param divida Dados da dívida (exceto ID)
   * @returns Dívida criada
   */
  async create(divida: Omit<Divida, 'id'>): Promise<Divida> {
    const { data, error } = await supabase
      .from('Divida')
      .insert({
        descricao: divida.descricao,
        valor: divida.valor,
        data_vencimento: divida.data_vencimento,
        status: divida.status,
        posto_id: divida.posto_id
      })
      .select()
      .single();
    if (error) throw error;

    return {
      id: String(data.id),
      descricao: data.descricao,
      valor: Number(data.valor),
      data_vencimento: data.data_vencimento,
      status: data.status,
      posto_id: data.posto_id
    };
  },

  /**
   * Atualiza uma dívida existente.
   * @param id ID da dívida
   * @param updates Dados para atualização
   * @returns Dívida atualizada
   */
  async update(id: string, updates: Partial<Divida>): Promise<Divida> {
    const { id: _, ...updateData } = updates;

    const { data, error } = await supabase
      .from('Divida')
      .update(updateData)
      .eq('id', Number(id))
      .select()
      .single();
    if (error) throw error;

    return {
      id: String(data.id),
      descricao: data.descricao,
      valor: Number(data.valor),
      data_vencimento: data.data_vencimento,
      status: data.status,
      posto_id: data.posto_id
    };
  },

  /**
   * Remove uma dívida.
   * @param id ID da dívida
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('Divida')
      .delete()
      .eq('id', Number(id));
    if (error) throw error;
  }
};
