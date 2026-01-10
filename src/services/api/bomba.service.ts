/**
 * Service de Bombas
 *
 * @remarks
 * Gerencia operações CRUD de bombas
 */

import { supabase, withPostoFilter } from './base';
import type { Bomba, Bico, Combustivel, InsertTables, UpdateTables } from '@/types/database/index';

export const bombaService = {
  async getAll(postoId?: number): Promise<Bomba[]> {
    const baseQuery = supabase
      .from('Bomba')
      .select('*')
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);
    
    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getWithBicos(postoId?: number): Promise<(Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[]> {
    const baseQuery = supabase
      .from('Bomba')
      .select(`
        *,
        bicos:Bico(
          *,
          combustivel:Combustivel(*)
        )
      `)
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query.order('nome');
    if (error) throw error;
    
    // Casting necessário devido à complexidade do retorno do join
    return (data || []) as (Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[];
  },

  async create(bomba: InsertTables<'Bomba'>): Promise<Bomba> {
    const { data, error } = await supabase
      .from('Bomba')
      .insert(bomba)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, bomba: UpdateTables<'Bomba'>): Promise<Bomba> {
    const { data, error } = await supabase
      .from('Bomba')
      .update(bomba)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
