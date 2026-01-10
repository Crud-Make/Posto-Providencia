import { supabase } from '../supabase';
import { Fechamento, InsertTables, UpdateTables, Recebimento, FormaPagamento, Maquininha, FechamentoFrentista, Frentista, Usuario, Turno } from '../../types/database';

export const fechamentoService = {
  /**
   * Busca um fechamento único por data e posto.
   * Assume turno_id = 1 (padrão legado/simplificado).
   */
  async getByDateUnique(data: string, postoId?: number): Promise<Fechamento | null> {
    let query = supabase
      .from('Fechamento')
      .select('*')
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`)
      .eq('turno_id', 1);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: fechamentos, error } = await query.order('id', { ascending: false }).limit(1);
    if (error) throw error;
    return fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;
  },

  async getByDateAndTurno(data: string, turnoId: number, postoId?: number): Promise<Fechamento | null> {
    let query = supabase
      .from('Fechamento')
      .select('*')
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`)
      .eq('turno_id', turnoId);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: fechamentos, error } = await query.order('id', { ascending: false }).limit(1);
    if (error) throw error;
    return fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;
  },

  async getByDate(data: string, postoId?: number): Promise<(Fechamento & { turno: Turno | null; usuario: { id: string; nome: string } | null })[]> {
    let query = supabase
      .from('Fechamento')
      .select(`
        *,
        turno:Turno(*),
        usuario:Usuario(id, nome)
      `)
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: fechamentos, error } = await query;
    if (error) throw error;
    // @ts-ignore - Supabase types join mapping might be tricky
    return fechamentos || [];
  },

  async getWithDetails(id: number) {
    const { data, error } = await supabase
      .from('Fechamento')
      .select(`
        *,
        recebimentos:Recebimento(
          *,
          forma_pagamento:FormaPagamento(*),
          maquininha:Maquininha(*)
        ),
        fechamentos_frentista:FechamentoFrentista(
          *,
          frentista:Frentista(*)
        ),
        usuario:Usuario(id, nome)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getRecent(limit = 10, postoId?: number): Promise<Fechamento[]> {
    let query = supabase
      .from('Fechamento')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query
      .order('data', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async create(fechamento: Omit<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'> & Partial<Pick<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'>>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .insert({
        ...fechamento,
        diferenca: fechamento.diferenca ?? 0,
        total_recebido: fechamento.total_recebido ?? 0,
        total_vendas: fechamento.total_vendas ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, fechamento: UpdateTables<'Fechamento'>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .update(fechamento)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async finalize(id: number, observacoes?: string): Promise<Fechamento> {
    return this.update(id, {
      status: 'FECHADO',
      observacoes,
    });
  },
};
