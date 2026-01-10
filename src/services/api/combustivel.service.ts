/**
 * Service de Combustíveis
 *
 * @remarks
 * Gerencia operações CRUD de combustíveis do posto
 */

import { supabase, withPostoFilter } from './base';
import type { Combustivel, InsertTables, UpdateTables } from '../../types/database/index';

/** Ordem de exibição padrão dos combustíveis */
const ORDEM_COMBUSTIVEIS = ['GC', 'GA', 'ET', 'S10', 'DIESEL'] as const;

export const combustivelService = {
  /** Ordem customizada dos combustíveis */
  ORDEM_COMBUSTIVEIS,

  /**
   * Busca todos os combustíveis ativos
   *
   * @param postoId - Filtro opcional por posto
   * @returns Lista de combustíveis ordenada
   */
  async getAll(postoId?: number): Promise<Combustivel[]> {
    const baseQuery = supabase
      .from('Combustivel')
      .select('*')
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);
    const { data, error } = await query;

    if (error) throw error;

    // Ordena por ordem customizada
    const ordem = ORDEM_COMBUSTIVEIS;
    return (data || []).sort((a, b) => {
      const indexA = ordem.indexOf(a.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
      const indexB = ordem.indexOf(b.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
      // Itens não encontrados vão para o final
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  },

  async getById(id: number): Promise<Combustivel | null> {
    const { data, error } = await supabase
      .from('Combustivel')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(combustivel: InsertTables<'Combustivel'>): Promise<Combustivel> {
    const { data, error } = await supabase
      .from('Combustivel')
      .insert(combustivel)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, combustivel: UpdateTables<'Combustivel'>): Promise<Combustivel> {
    const { data, error } = await supabase
      .from('Combustivel')
      .update(combustivel)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
