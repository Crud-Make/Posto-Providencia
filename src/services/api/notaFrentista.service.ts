import { supabase } from '../supabase';

export interface NotaFrentista {
  id: number;
  cliente_id: number;
  frentista_id: number;
  fechamento_frentista_id?: number;
  valor: number;
  descricao?: string;
  observacoes?: string;
  data: string;
  status: 'pendente' | 'pago' | 'cancelado';
  data_pagamento?: string;
  forma_pagamento?: string;
  posto_id: number;
  created_at?: string;
  cliente?: {
    id: number;
    nome: string;
    documento?: string;
    telefone?: string;
  };
  frentista?: {
    id: number;
    nome: string;
  };
}

export interface ResumoFiado {
  totalPendente: number;
  totalClientes: number;
  notasPendentes: number;
  maiorDevedor: { nome: string; valor: number } | null;
}

export const notaFrentistaService = {
  async getAll(postoId?: number): Promise<NotaFrentista[]> {
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
    return (data as unknown as NotaFrentista[]) || [];
  },

  async getPendentes(postoId?: number): Promise<NotaFrentista[]> {
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
    return (data as unknown as NotaFrentista[]) || [];
  },

  async getByCliente(clienteId: number): Promise<NotaFrentista[]> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .select(`
        *,
        frentista:Frentista(id, nome)
      `)
      .eq('cliente_id', clienteId)
      .order('data', { ascending: false });

    if (error) throw error;
    return (data as unknown as NotaFrentista[]) || [];
  },

  async getByDateRange(dataInicio: string, dataFim: string, postoId?: number): Promise<NotaFrentista[]> {
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
    return (data as unknown as NotaFrentista[]) || [];
  },

  async create(nota: {
    cliente_id: number;
    frentista_id: number;
    fechamento_frentista_id?: number;
    valor: number;
    descricao?: string;
    data?: string;
    posto_id: number;
  }): Promise<NotaFrentista> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .insert({
        ...nota,
        data: nota.data || new Date().toISOString().split('T')[0],
        status: 'pendente'
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as NotaFrentista;
  },

  async registrarPagamento(id: number, formaPagamento: string, observacoes?: string, dataPagamento?: string): Promise<NotaFrentista> {
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
    return data as unknown as NotaFrentista;
  },

  async cancelar(id: number, observacoes?: string): Promise<NotaFrentista> {
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
    return data as unknown as NotaFrentista;
  },

  async update(id: number, updates: {
    valor?: number;
    descricao?: string;
    observacoes?: string;
  }): Promise<NotaFrentista> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as NotaFrentista;
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
    const totalPendente = notas.reduce((acc: number, n: any) => acc + n.valor, 0);

    // Agrupa por cliente
    const porCliente: Record<string, { nome: string; valor: number }> = {};
    notas.forEach((n: any) => {
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
