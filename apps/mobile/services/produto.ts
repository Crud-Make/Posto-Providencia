import { supabase } from '../lib/supabase';

/**
 * Interface que representa um produto à venda no posto.
 */
export interface Produto {
    /** Identificador único do produto */
    id: number;
    /** Nome/Descrição do produto */
    nome: string;
    /** Preço de venda unitário */
    preco_venda: number;
    /** Quantidade atual em estoque */
    estoque_atual: number;
    /** Categoria do produto (ex: 'Lubrificantes', 'Conveniência') */
    categoria: string;
    /** Indica se o produto está ativo para venda */
    ativo: boolean;
}

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

