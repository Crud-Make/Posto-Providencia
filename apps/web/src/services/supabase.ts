import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Configuração do Supabase Client
// Essas variáveis devem ser definidas no arquivo .env na raiz do projeto
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not found in environment variables. Please check your .env file.');
}

/**
 * Cliente Supabase com tipagem completa do banco de dados.
 *
 * @remarks A sessão é persistida no navegador e renovada sozinha — quem entrou
 *          uma vez continua entrado ao voltar, sem redigitar. `flowType: 'pkce'`
 *          cumpre o CLAUDE.md §5; o padrão da lib é o fluxo implícito, que expõe
 *          o token na URL.
 */
export const supabase = createClient<Database>(
    SUPABASE_URL || 'https://placeholder-project.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder-key',
    {
        auth: {
            flowType: 'pkce',
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);

// Export do tipo para uso em outros lugares
export type { Database };
