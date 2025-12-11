
import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Substitua pelos valores do seu projeto Supabase
// Usamos um placeholder com formato de URL válida para evitar erro de inicialização (TypeError: Invalid URL)
// O cliente irá falhar nas requisições de rede, mas o app usará os dados de fallback (constants.ts) automaticamente.
const SUPABASE_URL = 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
