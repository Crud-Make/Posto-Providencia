import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let cliente: SupabaseClient | null = null;

/** O OCR e o push ainda passam pela Edge Function (fatias 2 e 3 os levam ao Laravel). */
export function supabaseConfigurado(): boolean {
  return SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
}

/**
 * O cliente nasce SÓ quando alguém precisa dele. Antes nascia na importação: sem `VITE_SUPABASE_URL` o
 * `createClient` lançava "supabaseUrl is required" e o app inteiro abria em branco — inclusive o login, as
 * leituras e os envios, que já vão pelo Laravel (01/10/2026).
 */
export function clienteSupabase(): SupabaseClient {
  if (!supabaseConfigurado()) {
    throw new Error('A leitura por foto e os avisos ainda não estão disponíveis aqui. Digite as leituras à mão.');
  }
  cliente ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cliente;
}
