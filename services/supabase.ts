import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Configuração do Supabase Client
// Essas variáveis devem ser definidas no arquivo .env na raiz do projeto
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not found in environment variables. Please check your .env file.');
}

// Cliente Supabase com tipagem completa do banco de dados
export const supabase = createClient<Database>(
    SUPABASE_URL || 'https://placeholder-project.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder-key'
);

// Export do tipo para uso em outros lugares
export type { Database };
