/**
 * Service de Turnos
 *
 * @remarks
 * Gerencia operações CRUD de turnos
 */

import { supabase, withPostoFilter } from './base';
import type { Turno, InsertTables, UpdateTables } from '../../types/database/index';

export const turnoService = {
  async getAll(postoId?: number): Promise<Turno[]> {
    const baseQuery = supabase
      .from('Turno')
      .select('*');

    const query = withPostoFilter(baseQuery, postoId);
    
    const { data, error } = await query.order('horario_inicio');
    if (error) throw error;
    return data || [];
  },

  async create(turno: InsertTables<'Turno'>): Promise<Turno> {
    const { data, error } = await supabase
      .from('Turno')
      .insert(turno)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, turno: UpdateTables<'Turno'>): Promise<Turno> {
    const { data, error } = await supabase
      .from('Turno')
      .update(turno)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
