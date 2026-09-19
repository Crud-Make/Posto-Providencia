// Public API de shared/api (FSD-3). A borda com o mundo mora aqui: é o único lugar do app onde
// `try/catch` é permitido (RES-3), virando `ResultAsync.fromPromise` quando o Result chegar.
export { supabase } from './supabase';
