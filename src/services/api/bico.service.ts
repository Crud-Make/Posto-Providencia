/**
 * Service de Bicos
 *
 * @remarks
 * Gerencia operações CRUD de bicos
 */

import { supabase, withPostoFilter } from './base';
import type { Bico, Bomba, Combustivel, InsertTables, UpdateTables } from '../../types/database';

export const bicoService = {
  async getAll(postoId?: number): Promise<Bico[]> {
    const baseQuery = supabase
      .from('Bico')
      .select('*')
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query.order('numero');
    if (error) throw error;
    return data || [];
  },

  async getWithDetails(postoId?: number): Promise<(Bico & { bomba: Bomba; combustivel: Combustivel })[]> {
    const baseQuery = supabase
      .from('Bico')
      .select(`
        *,
        bomba:Bomba(*),
        combustivel:Combustivel(*)
      `)
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query.order('numero');
    if (error) throw error;
    
    // Casting para garantir tipagem correta do join
    return (data || []) as (Bico & { bomba: Bomba; combustivel: Combustivel })[];
  },

  async create(bico: InsertTables<'Bico'>): Promise<Bico> {
    const { data, error } = await supabase
      .from('Bico')
      .insert(bico)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, bico: UpdateTables<'Bico'>): Promise<Bico> {
    const { data, error } = await supabase
      .from('Bico')
      .update(bico)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
