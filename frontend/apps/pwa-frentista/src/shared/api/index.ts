// Public API de shared/api (FSD-3). A borda com o mundo mora aqui: é o único lugar do app onde
// `try/catch`/`throw` são permitidos (RES-3), e a falha vira valor em `executar`
// (`ResultAsync.fromPromise`).
export { supabase } from './supabase';
export { executar } from './executar';
export { conferirDepoisDeGravar, validar } from './validar';
export type { RespostaDoSupabase } from './executar';
export { assertUnreachable, erroDeRede, paraExcecao } from './erros';
export type { ErroDeApi } from './erros';
