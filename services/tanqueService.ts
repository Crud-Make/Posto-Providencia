import { supabase } from './supabase';
import { Database } from './database.types';

export type Tanque = Database['public']['Tables']['Tanque']['Row'] & {
    combustivel?: {
        nome: string;
        codigo: string;
        preco_venda: number;
        preco_custo: number;
    };
};
type InsertTanque = Database['public']['Tables']['Tanque']['Insert'];
type UpdateTanque = Database['public']['Tables']['Tanque']['Update'];

export const tanqueService = {
    async getAll(postoId?: number) {
        let query = supabase
            .from('Tanque')
            .select('*, combustivel:Combustivel(nome, codigo, preco_venda, preco_custo)')
            .eq('ativo', true)
            .order('nome');

        if (postoId) query = query.eq('posto_id', postoId);

        const { data, error } = await query;
        if (error) throw error;
        return data as Tanque[];
    },

    async getById(id: number) {
        const { data, error } = await supabase
            .from('Tanque')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async create(tanque: InsertTanque) {
        const { data, error } = await supabase
            .from('Tanque')
            .insert(tanque)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id: number, tanque: UpdateTanque) {
        const { data, error } = await supabase
            .from('Tanque')
            .update(tanque)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateStock(id: number, delta: number) {
        // 1. Get current stock
        const { data: current, error: fetchError } = await supabase
            .from('Tanque')
            .select('estoque_atual')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Calculate new stock
        const newStock = (current.estoque_atual || 0) + delta;

        // 3. Update
        const { data, error } = await supabase
            .from('Tanque')
            .update({ estoque_atual: newStock })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: number) {
        const { error } = await supabase
            .from('Tanque')
            .update({ ativo: false })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async getHistory(tanqueId: number, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('HistoricoTanque')
            .select('*')
            .eq('tanque_id', tanqueId)
            .gte('data', startDate.toISOString().split('T')[0])
            .order('data', { ascending: true });

        if (error) throw error;
        return data as Database['public']['Tables']['HistoricoTanque']['Row'][];
    },

    async saveHistory(payload: { tanque_id: number; data: string; volume_livro?: number; volume_fisico?: number }) {
        const { error } = await supabase
            .from('HistoricoTanque')
            .upsert(payload, { onConflict: 'tanque_id, data' });

        if (error) throw error;
    }
};
