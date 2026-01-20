import { supabase } from '../lib/supabase';

/**
 * Interface que representa um usuário do sistema (vinculado ao Supabase Auth).
 */
export interface Usuario {
    /** Identificador numérico do usuário (chave primária na tabela Usuario) */
    id: number;
    /** Nome completo do usuário */
    nome: string;
    /** Email do usuário (deve corresponder ao email no Auth) */
    email: string;
    /** Papel/Função do usuário (ex: 'ADMIN', 'FRENTISTA') */
    role: string;
    /** ID do posto ao qual o usuário está vinculado */
    posto_id?: number;
}

/**
 * Serviço para gerenciar operações relacionadas a usuários.
 */
export const usuarioService = {
    /**
     * Busca o perfil completo de um usuário pelo email.
     * 
     * @param {string} email - O email do usuário a ser buscado.
     * @returns {Promise<Usuario | null>} O perfil do usuário ou null se não encontrado.
     */
    async getByEmail(email: string): Promise<Usuario | null> {
        const { data, error } = await supabase
            .from('Usuario')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        return data;
    },
};
