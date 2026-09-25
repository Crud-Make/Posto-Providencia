import { createClient } from '@supabase/supabase-js';

// `import.meta.env.VITE_*` é `any` no tipo do Vite, e `any || ''` reprova em
// strict-boolean-expressions. `typeof` faz a condição explícita sem mudar o que se valida:
// variável ausente (ou vazia) continua virando ''.
const url: unknown = import.meta.env.VITE_SUPABASE_URL;
const anonKey: unknown = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = typeof url === 'string' ? url : '';
const SUPABASE_ANON_KEY = typeof anonKey === 'string' ? anonKey : '';

// Sem credenciais (CI, teste, build sem .env) o cliente nasce com um endereço de reserva e avisa,
// como o do painel (`apps/web/src/services/supabase.ts`). Antes o `createClient('')` lançava
// "supabaseUrl is required" já no import, e todo teste que tocasse `@frentista/shared/api`
// quebrava no CI — que não tem .env —, mesmo passando na máquina com .env. Uma chamada real com
// o endereço de reserva falha como falha de rede, que o app já trata.
if (SUPABASE_URL === '' || SUPABASE_ANON_KEY === '') {
  console.warn('⚠️ Credenciais do Supabase ausentes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(
  SUPABASE_URL === '' ? 'https://placeholder-project.supabase.co' : SUPABASE_URL,
  SUPABASE_ANON_KEY === '' ? 'placeholder-key' : SUPABASE_ANON_KEY,
);
