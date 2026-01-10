/**
 * Service de Configurações
 *
 * @remarks
 * Gerencia configurações do sistema (chave-valor)
 */

import { supabase, withPostoFilter } from './base';
import type { Configuracao } from '../../types/database/index';

export const configuracaoService = {
  async getAll(postoId?: number): Promise<Configuracao[]> {
    const baseQuery = supabase
      .from('Configuracao')
      .select('*');

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query.order('categoria', { ascending: true });
    if (error) throw error;
    return (data || []) as Configuracao[];
  },

  async getByChave(chave: string, postoId?: number): Promise<Configuracao | null> {
    const baseQuery = supabase
      .from('Configuracao')
      .select('*')
      .eq('chave', chave);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Configuracao | null;
  },

  async getByCategoria(categoria: string, postoId?: number): Promise<Configuracao[]> {
    const baseQuery = supabase
      .from('Configuracao')
      .select('*')
      .eq('categoria', categoria);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Configuracao[];
  },

  async update(chave: string, valor: string, postoId?: number): Promise<Configuracao> {
    const baseQuery = supabase
      .from('Configuracao')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query
      .select()
      .single();
    if (error) throw error;
    return data as Configuracao;
  },

  async getValorNumerico(chave: string, valorPadrao: number = 0): Promise<number> {
    try {
      const config = await this.getByChave(chave);
      if (!config) return valorPadrao;
      return parseFloat(config.valor) || valorPadrao;
    } catch {
      return valorPadrao;
    }
  },

  async create(config: Omit<Configuracao, 'id' | 'updated_at'>): Promise<Configuracao> {
    const { data, error } = await supabase
      .from('Configuracao')
      .insert(config)
      .select()
      .single();
    if (error) throw error;
    return data as Configuracao;
  }
};
