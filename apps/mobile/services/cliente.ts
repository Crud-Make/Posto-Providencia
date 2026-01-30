import { supabase } from '../lib/supabase';

/**
 * Interface que representa um cliente no sistema.
 */
export interface Cliente {
    /** Identificador único do cliente */
    id: number;
    /** Nome completo do cliente */
    nome: string;
    /** Documento (CPF/CNPJ) do cliente */
    documento?: string;
    /** ID do posto ao qual o cliente pertence */
    posto_id?: number;
    /** Indica se o cliente está ativo */
    ativo: boolean;
    /** Indica se o cliente está bloqueado para vendas a prazo */
    bloqueado?: boolean;
}

/**
 * Serviço para gerenciar operações relacionadas a clientes.
 */
export const clienteService = {
    /**
     * Busca todos os clientes ativos de um posto específico.
     * 
     * @param {number} [postoId] - O ID do posto para filtrar os clientes.
     * @returns {Promise<Cliente[]>} Uma lista de clientes ativos.
     */
    async getAll(postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('Error fetching clientes:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Busca clientes por nome (busca insensível a maiúsculas/minúsculas).
     * 
     * @param {string} text - O texto para buscar no nome do cliente.
     * @param {number} [postoId] - O ID do posto para filtrar a busca.
     * @returns {Promise<Cliente[]>} Uma lista de clientes que correspondem à busca.
     */
    async search(text: string, postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true)
            .ilike('nome', `%${text}%`);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.limit(20);

        if (error) {
            console.error('Error searching clientes:', error);
            return [];
        }

        return data || [];
    }
};
