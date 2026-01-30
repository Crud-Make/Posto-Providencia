import { supabase } from '../lib/supabase';

/**
 * Interface que representa um Posto de Combustível no sistema.
 */
export interface Posto {
    /** Identificador único do posto */
    id: number;
    /** Nome fantasia do posto */
    nome: string;
    /** CNPJ do posto */
    cnpj: string | null;
    /** Endereço completo */
    endereco: string | null;
    /** Cidade onde o posto está localizado */
    cidade: string | null;
    /** Estado (UF) onde o posto está localizado */
    estado: string | null;
    /** Telefone de contato */
    telefone: string | null;
    /** Email de contato */
    email: string | null;
    /** Indica se o posto está ativo no sistema */
    ativo: boolean;
}

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
