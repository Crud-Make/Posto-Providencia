/**
 * Service de Postos
 *
 * @remarks
 * Gerencia operações CRUD de postos
 */

import { supabase } from './base';
import type { Posto, InsertTables, UpdateTables } from '../../types/database/index';

export const postoService = {
  async getAll(): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .eq('ativo', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Posto | null> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByUser(usuarioId: number): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('UsuarioPosto')
      .select(`
        *,
        posto:Posto(*)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ativo', true);

    if (error) throw error;
    type UsuarioPostoComPosto = { posto: Posto | null };
    const typedData = (data || []) as UsuarioPostoComPosto[];
    return typedData.map((up) => up.posto).filter((posto): posto is Posto => Boolean(posto));
  },

  async getAllIncludingInactive(): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async create(posto: Omit<InsertTables<'Posto'>, 'id' | 'created_at'>): Promise<Posto> {
    const { data, error } = await supabase
      .from('Posto')
      .insert(posto)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, posto: UpdateTables<'Posto'>): Promise<Posto> {
    const { data, error } = await supabase
      .from('Posto')
      .update(posto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    // Soft delete - apenas desativa o posto
    const { error } = await supabase
      .from('Posto')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  }
};
