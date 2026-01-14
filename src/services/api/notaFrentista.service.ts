import { supabase } from '../supabase';
import type { NotaFrentistaTable, ClienteTable } from '../../types/database/tables/clientes';
import type { FrentistaTable } from '../../types/database/tables/operacoes';
import type { WithRelations } from '../../types/ui/helpers';

// [14/01 10:30] Refatoração para usar tipos do Supabase e WithRelations
export type NotaFrentista = NotaFrentistaTable['Row'];
export type Cliente = ClienteTable['Row'];
export type Frentista = FrentistaTable['Row'];

export type NotaFrentistaResponse = WithRelations<
  NotaFrentista,
  {
    cliente?: Partial<Cliente>;
    frentista?: Partial<Frentista>;
  }
>;

export interface ResumoFiado {
  totalPendente: number;
  totalClientes: number;
  notasPendentes: number;
  maiorDevedor: { nome: string; valor: number } | null;
}

export const notaFrentistaService = {
  async getAll(postoId?: number): Promise<NotaFrentistaResponse[]> {
    let query = supabase
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome, documento),
        frentista:Frentista(id, nome)
      `);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return (data || []) as NotaFrentistaResponse[];
  },

  async getPendentes(postoId?: number): Promise<NotaFrentistaResponse[]> {
    let query = supabase
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome, documento, telefone),
        frentista:Frentista(id, nome)
      `)
      .eq('status', 'pendente');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return (data || []) as NotaFrentistaResponse[];
  },

  async getByCliente(clienteId: number): Promise<NotaFrentistaResponse[]> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .select(`
        *,
        frentista:Frentista(id, nome)
      `)
      .eq('cliente_id', clienteId)
      .order('data', { ascending: false });

    if (error) throw error;
    return (data || []) as NotaFrentistaResponse[];
  },

  async getByDateRange(dataInicio: string, dataFim: string, postoId?: number): Promise<NotaFrentistaResponse[]> {
    let query = supabase
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome),
        frentista:Frentista(id, nome)
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return (data || []) as NotaFrentistaResponse[];
  },

  async create(nota: NotaFrentistaTable['Insert']): Promise<NotaFrentistaResponse> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .insert({
        ...nota,
        data: nota.data || new Date().toISOString().split('T')[0],
        status: nota.status || 'pendente'
      })
      .select()
      .single();
    if (error) throw error;
    return data as NotaFrentistaResponse;
  },

  async registrarPagamento(id: number, formaPagamento: string, observacoes?: string, dataPagamento?: string): Promise<NotaFrentistaResponse> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update({
        status: 'pago',
        // Usa a data fornecida ou a data atual como fallback
        data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
        forma_pagamento: formaPagamento,
        observacoes
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as NotaFrentistaResponse;
  },

  async cancelar(id: number, observacoes?: string): Promise<NotaFrentistaResponse> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update({
        status: 'cancelado',
        observacoes
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as NotaFrentistaResponse;
  },

  async update(id: number, updates: NotaFrentistaTable['Update']): Promise<NotaFrentistaResponse> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as NotaFrentistaResponse;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('NotaFrentista')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Resumo de fiado
  async getResumo(postoId?: number): Promise<ResumoFiado> {
    let query = supabase
      .from('NotaFrentista')
      .select(`
        valor,
        cliente:Cliente(id, nome)
      `)
      .eq('status', 'pendente');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const notas = data || [];
    type NotaComCliente = { valor: number; cliente: { id: number; nome: string } | null };
    const notasTyped = notas as NotaComCliente[];
    const totalPendente = notasTyped.reduce((acc, n) => acc + n.valor, 0);

    // Agrupa por cliente
    const porCliente: Record<string, { nome: string; valor: number }> = {};
    notasTyped.forEach((n) => {
      const clienteId = n.cliente?.id?.toString() || 'unknown';
      const clienteNome = n.cliente?.nome || 'Desconhecido';
      if (!porCliente[clienteId]) {
        porCliente[clienteId] = { nome: clienteNome, valor: 0 };
      }
      porCliente[clienteId].valor += n.valor;
    });

    const clientesUnicos = Object.keys(porCliente).length;
    const maiorDevedor = Object.values(porCliente).sort((a, b) => b.valor - a.valor)[0] || null;

    return {
      totalPendente,
      totalClientes: clientesUnicos,
      notasPendentes: notas.length,
      maiorDevedor
    };
  }
};
