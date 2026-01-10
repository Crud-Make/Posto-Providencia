import { supabase } from '../supabase';

export interface Cliente {
  id: number;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  limite_credito?: number;
  saldo_devedor?: number;
  ativo: boolean;
  bloqueado?: boolean;
  posto_id: number;
  created_at?: string;
  notas?: any[]; // Tipo NotaFrentista será definido no outro arquivo, usando any aqui para evitar dependência circular complexa ou usar interface local
}

export const clienteService = {
  async getAll(postoId?: number): Promise<Cliente[]> {
    let query = supabase
      .from('Cliente')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return (data as unknown as Cliente[]) || [];
  },

  async getAllWithSaldo(postoId?: number): Promise<Cliente[]> {
    let query = supabase
      .from('Cliente')
      .select(`
        *,
        notas:NotaFrentista(id, valor, status, data)
      `)
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return (data as unknown as Cliente[]) || [];
  },

  async getById(id: number): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('Cliente')
      .select(`
        *,
        notas:NotaFrentista(
          *,
          frentista:Frentista(id, nome)
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as Cliente;
  },

  async getDevedores(postoId?: number): Promise<Cliente[]> {
    let query = supabase
      .from('Cliente')
      .select('*')
      .eq('ativo', true)
      .gt('saldo_devedor', 0);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('saldo_devedor', { ascending: false });
    if (error) throw error;
    return (data as unknown as Cliente[]) || [];
  },

  async create(cliente: {
    nome: string;
    documento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    limite_credito?: number;
    posto_id: number;
  }): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .insert(cliente)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Cliente;
  },

  async update(id: number, updates: {
    nome?: string;
    documento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    limite_credito?: number;
    ativo?: boolean;
    bloqueado?: boolean;
  }): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Cliente;
  },

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await supabase
      .from('Cliente')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },

  async search(termo: string, postoId?: number): Promise<Cliente[]> {
    let query = supabase
      .from('Cliente')
      .select('*')
      .eq('ativo', true)
      .or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%,telefone.ilike.%${termo}%`);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome').limit(20);
    if (error) throw error;
    return (data as unknown as Cliente[]) || [];
  }
};
