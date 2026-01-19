import { supabase } from '../lib/supabase';
import type { Posto as PostoDb } from '@posto/types';

export type Posto = PostoDb;

/**
 * Serviço para gerenciar operações relacionadas a postos.
 */
export const postoService = {
    /**
     * Busca todos os postos ativos cadastrados no sistema.
     * 
     * @returns {Promise<Posto[]>} Lista de postos ativos ordenados por nome.
     */
    async getAll(): Promise<Posto[]> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('Error fetching postos:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Busca os detalhes de um posto específico pelo ID.
     * 
     * @param {number} id - ID do posto.
     * @returns {Promise<Posto | null>} Os dados do posto ou null se não encontrado.
     */
    async getById(id: number): Promise<Posto | null> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching posto:', error);
            return null;
        }
        return data;
    }
};
