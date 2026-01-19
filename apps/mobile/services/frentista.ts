import { supabase } from '../lib/supabase';
import type { Frentista as FrentistaDb } from '@posto/types';

export type Frentista = FrentistaDb;

/**
 * Serviço para gerenciar operações relacionadas a frentistas.
 */
export const frentistaService = {
    /**
     * Busca o frentista associado a um usuário logado (pelo ID do Auth).
     * 
     * @param {string} userId - UUID do usuário no Supabase Auth.
     * @returns {Promise<Frentista | null>} O frentista encontrado ou null.
     */
    async getByUserId(userId: string): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true)
            .single();

        if (error) {
            console.error('Error fetching frentista:', error);
            return null;
        }

        return data;
    },

    /**
     * Atualiza os dados de um frentista.
     * 
     * @param {number} id - ID do frentista.
     * @param {Partial<Frentista>} updates - Campos a serem atualizados.
     * @returns {Promise<Frentista | null>} O frentista atualizado ou null em caso de erro.
     */
    async update(id: number, updates: Partial<Frentista>): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating frentista:', error);
            return null;
        }
        return data;
    },

    /**
     * Busca todos os frentistas ativos de um posto.
     * 
     * @param {number} postoId - ID do posto.
     * @returns {Promise<Frentista[]>} Lista de frentistas ativos ordenados por nome.
     */
    async getAllByPosto(postoId: number): Promise<Frentista[]> {
        const { data, error } = await supabase
            .from('Frentista')
            .select('*')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('Error fetching frentistas by posto:', error);
            return [];
        }

        return data || [];
    },
};
