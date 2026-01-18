import { supabase } from '../lib/supabase';
import type { Produto as ProdutoDb } from '@posto/types';

export type Produto = ProdutoDb;

/**
 * Serviço para gerenciar operações relacionadas a produtos.
 */
export const produtoService = {
    /**
     * Busca todos os produtos ativos de um posto.
     * 
     * @param {number} [postoId] - O ID do posto para filtrar os produtos.
     * @returns {Promise<Produto[]>} Lista de produtos ativos ordenados por nome.
     */
    async getAll(postoId?: number): Promise<Produto[]> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }

        return data || [];
    },
};
