import { supabase } from '../supabase';
import type { RecebimentoTable, FechamentoTable } from '../../types/database/tables/operacoes';
import type { FormaPagamentoTable, MaquininhaTable } from '../../types/database/tables/pagamentos';
import type { WithRelations } from '../../types/ui/helpers';

// [14/01 10:45] Refatoração para usar tipos do Supabase e WithRelations
export type Recebimento = RecebimentoTable['Row'];
export type FormaPagamento = FormaPagamentoTable['Row'];
export type Maquininha = MaquininhaTable['Row'];
export type Fechamento = FechamentoTable['Row'];

export type RecebimentoCompleto = WithRelations<
  Recebimento,
  {
    forma_pagamento: FormaPagamento | null;
    maquininha: Maquininha | null;
    fechamento?: Pick<Fechamento, 'data'>;
  }
>;

export const recebimentoService = {
  async getByFechamento(fechamentoId: number): Promise<RecebimentoCompleto[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .select(`
        *,
        forma_pagamento:FormaPagamento(*),
        maquininha:Maquininha(*)
      `)
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
    return (data || []) as RecebimentoCompleto[];
  },

  async create(recebimento: RecebimentoTable['Insert']): Promise<Recebimento> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimento)
      .select()
      .single();
    if (error) throw error;
    return data as Recebimento;
  },

  async bulkCreate(recebimentos: RecebimentoTable['Insert'][]): Promise<Recebimento[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimentos)
      .select();
    if (error) throw error;
    return (data || []) as Recebimento[];
  },

  async deleteByFechamento(fechamentoId: number): Promise<void> {
    const { error } = await supabase
      .from('Recebimento')
      .delete()
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
  },

  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<RecebimentoCompleto[]> {
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
    return (data || []) as RecebimentoCompleto[];
  },
};
