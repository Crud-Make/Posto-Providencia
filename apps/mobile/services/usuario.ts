import { supabase } from '../lib/supabase';
import type { Usuario as UsuarioDb } from '@posto/types';

export type Usuario = UsuarioDb;

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
