import { createClient } from '@supabase/supabase-js';

// `import.meta.env.VITE_*` é `any` no tipo do Vite, e `any || ''` reprova em
// strict-boolean-expressions. `typeof` faz a condição explícita sem mudar o que se valida:
// variável ausente (ou vazia) continua virando ''.
const url: unknown = import.meta.env.VITE_SUPABASE_URL;
const anonKey: unknown = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = typeof url === 'string' ? url : '';
const SUPABASE_ANON_KEY = typeof anonKey === 'string' ? anonKey : '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
