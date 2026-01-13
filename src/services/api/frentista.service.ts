/**
 * Service de Frentistas
 *
 * @remarks
 * Gerencia operações CRUD de frentistas
 */

import { supabase, withPostoFilter } from './base';
import type { Frentista, InsertTables, UpdateTables } from '@/types/database/index';

export const frentistaService = {
  async getWithEmail(postoId?: number): Promise<(Frentista & { email: string | null })[]> {
    const query = supabase.rpc('get_frentistas_with_email');

    const { data, error } = await query;
    if (error) throw error;

    const typedData = (data || []) as (Frentista & { email: string | null })[];

    if (postoId) {
      return typedData.filter((f) => f.posto_id === postoId);
    }

    return typedData;
  },

  async getAll(postoId?: number): Promise<Frentista[]> {
    let query = supabase
      .from('Frentista')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Frentista | null> {
    const { data, error } = await supabase
      .from('Frentista')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(frentista: InsertTables<'Frentista'>): Promise<Frentista> {
    const { data, error } = await supabase
      .from('Frentista')
      .insert(frentista)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, frentista: UpdateTables<'Frentista'>): Promise<Frentista> {
    const { data, error } = await supabase
      .from('Frentista')
      .update(frentista)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('Frentista')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },
};
