import { supabase } from '../supabase';
import type { ClienteTable } from '../../types/database/tables/clientes';
import type { FrentistaTable } from '../../types/database/tables/operacoes';
import type { WithRelations } from '../../types/ui/helpers';
import type { Cliente, NotaFrentista } from '../../types/ui/smart-types';

// [14/01 15:20] Centralização de tipos de Cliente/NotaFrentista em smart-types.ts

// Tipos com relacionamentos
export type NotaFrentistaComFrentista = WithRelations<
  NotaFrentista,
  { frentista?: Pick<FrentistaTable['Row'], 'id' | 'nome'> }
>;

export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;

export type ClienteCompleto = WithRelations<
  Cliente,
  { notas?: NotaFrentistaComFrentista[] }
>;

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
    return (data || []) as Cliente[];
  },

  async getAllWithSaldo(postoId?: number): Promise<ClienteComNotas[]> {
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
    return (data || []) as ClienteComNotas[];
  },

  async getById(id: number): Promise<ClienteCompleto | null> {
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
    return data as ClienteCompleto;
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
    return (data || []) as Cliente[];
  },

  async create(cliente: ClienteTable['Insert']): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .insert(cliente)
      .select()
      .single();
    if (error) throw error;
    return data as Cliente;
  },

  async update(id: number, updates: ClienteTable['Update']): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Cliente;
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
    return (data || []) as Cliente[];
  }
};
