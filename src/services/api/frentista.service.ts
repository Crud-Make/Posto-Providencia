/**
 * Service de Frentistas
 *
 * @remarks
 * Gerencia operações CRUD de frentistas
 */

import { supabase, withPostoFilter } from './base';
import type { Frentista, InsertTables, UpdateTables } from '../../types/database';

export const frentistaService = {
  async getWithEmail(postoId?: number): Promise<(Frentista & { email: string | null })[]> {
    const query = supabase.rpc('get_frentistas_with_email');

    const { data, error } = await query;
    if (error) throw error;

    if (postoId && data) {
      return (data as any[]).filter((f: any) => f.posto_id === postoId);
    }

    return (data || []) as (Frentista & { email: string | null })[];
  },

  async getAll(postoId?: number): Promise<Frentista[]> {
    const baseQuery = supabase
      .from('Frentista')
      .select('*')
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);

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
