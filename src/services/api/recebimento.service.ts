import { supabase } from '../supabase';
import { Recebimento, InsertTables, FormaPagamento, Maquininha } from '../../types/database/index';

export const recebimentoService = {
  async getByFechamento(fechamentoId: number): Promise<(Recebimento & { forma_pagamento: FormaPagamento | null; maquininha: Maquininha | null })[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .select(`
        *,
        forma_pagamento:FormaPagamento(*),
        maquininha:Maquininha(*)
      `)
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
    // @ts-ignore - Supabase join types
    return data || [];
  },

  async create(recebimento: InsertTables<'Recebimento'>): Promise<Recebimento> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimento)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(recebimentos: InsertTables<'Recebimento'>[]): Promise<Recebimento[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimentos)
      .select();
    if (error) throw error;
    return data || [];
  },

  async deleteByFechamento(fechamentoId: number): Promise<void> {
    const { error } = await supabase
      .from('Recebimento')
      .delete()
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
  },

  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<(Recebimento & { forma_pagamento: FormaPagamento | null; maquininha: Maquininha | null })[]> {
    let query = supabase
      .from('Recebimento')
      .select(`
        *,
        forma_pagamento:FormaPagamento(*),
        maquininha:Maquininha(*),
        fechamento:Fechamento!inner(data, posto_id)
      `)
      .gte('fechamento.data', startDate)
      .lte('fechamento.data', endDate);

    if (postoId) {
      query = query.eq('fechamento.posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as (Recebimento & { forma_pagamento: FormaPagamento | null; maquininha: Maquininha | null })[];
  },
};
