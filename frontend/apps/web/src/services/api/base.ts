/**
 * Utilitários base para services da API
 */

import { errAsync, ResultAsync } from 'neverthrow';
import type { z } from 'zod';
import { supabase } from '../supabase';

/**
 * Por que uma leitura na API Laravel falhou. União discriminada: quem consome decide pela `tipo`,
 * nunca pela mensagem.
 */
export type ErroDaApi =
    | { readonly tipo: 'sem_api' }
    | { readonly tipo: 'rede'; readonly detalhe: string }
    | { readonly tipo: 'http'; readonly status: number }
    | { readonly tipo: 'formato'; readonly detalhe: string };

/**
 * Base da API Laravel, ou `null` quando o painel ainda lê do Supabase.
 *
 * @remarks
 * É a chave do strangler (Design Doc `painel-pela-api.md`, DECISÃO 1): cada service migrado
 * pergunta aqui antes de escolher a fonte. A Vercel não define `VITE_API_URL`, então a produção
 * continua no Supabase até o cutover (#105).
 */
export function urlDaApi(): string | null {
    const url = import.meta.env.VITE_API_URL;
    return typeof url === 'string' && url.trim() !== '' ? url.trim().replace(/\/+$/, '') : null;
}

/**
 * Token da sessão atual do Supabase, ou `null` quando não há sessão.
 *
 * @remarks
 * É o crachá que o guard da transição aceita (DECISÃO A, `docs/design/autenticacao.md` §3b): o
 * Laravel confere a assinatura e acha o `Usuario` por `auth_user_id`. O painel não troca de login
 * para as fatias migrarem — o token que ele já tem é o que a API aceita.
 *
 * **Nunca falha.** Sem sessão, ou com erro ao ler a sessão, devolve `null` e a requisição sai sem
 * `Authorization`. É deliberado: o catálogo da #97 ainda é público e a P4a/P4b o consome sem
 * token; fazer a falta de sessão virar erro quebraria o que já funciona. Rota protegida sem token
 * responde 401, que é o comportamento certo.
 *
 * Quando o Sanctum virar o emissor, só esta função muda.
 */
function tokenDaSessao(): ResultAsync<string | null, never> {
    return ResultAsync.fromSafePromise(
        (async (): Promise<string | null> => {
            try {
                const { data } = await supabase.auth.getSession();
                return data.session?.access_token ?? null;
            } catch {
                // Engolir aqui é a decisão, e ela é estreita: vale só para LER a sessão. Se o
                // client do Supabase não estiver de pé, `supabase.auth` é `undefined` e o acesso
                // lança de forma SÍNCRONA — fora de qualquer ResultAsync, escapando como exceção
                // e violando o contrato deste módulo ("regra de negócio acima disto não lança").
                // O `async` aqui transforma esse throw em rejeição, e o catch em `null`.
                // Resultado: a requisição sai sem `Authorization` e a rota protegida responde 401,
                // que é a falha certa. Nunca uma exceção no meio de um service.
                return null;
            }
        })(),
    );
}

/** Cabeçalhos da requisição: o `Bearer` entra só quando há sessão. */
function cabecalhos(token: string | null): Record<string, string> {
    return token === null ? { Accept: 'application/json' } : { Accept: 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * GET na API Laravel com a resposta validada por schema.
 *
 * @remarks
 * O `try/catch` do `fetch` vira `ResultAsync.fromPromise` aqui, na borda — regra de negócio acima
 * disto não lança. A resposta entra como `unknown` e só sai tipada depois do `safeParse`.
 *
 * Desde a #103 P5 a requisição leva o `Authorization` da sessão do Supabase, quando existe.
 */
export function buscarNaApi<T>(caminho: string, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    const base = urlDaApi();
    if (base === null) {
        return errAsync({ tipo: 'sem_api' });
    }

    return tokenDaSessao()
        .andThen((token) =>
            ResultAsync.fromPromise(
                fetch(`${base}${caminho}`, { headers: cabecalhos(token) }),
                (erro): ErroDaApi => ({ tipo: 'rede', detalhe: erro instanceof Error ? erro.message : String(erro) }),
            ),
        )
        .andThen((resposta) =>
            resposta.ok
                ? ResultAsync.fromPromise(
                      resposta.json() as Promise<unknown>,
                      (erro): ErroDaApi => ({ tipo: 'formato', detalhe: erro instanceof Error ? erro.message : String(erro) }),
                  )
                : errAsync<unknown, ErroDaApi>({ tipo: 'http', status: resposta.status }),
        )
        .andThen((corpo) => {
            const lido = schema.safeParse(corpo);
            return lido.success
                ? ResultAsync.fromSafePromise(Promise.resolve(lido.data))
                : errAsync<T, ErroDaApi>({ tipo: 'formato', detalhe: lido.error.message });
        });
}

/** Mensagem para o `ApiResponse` legado, que só conhece texto. */
export function descreverErroDaApi(erro: ErroDaApi): string {
    switch (erro.tipo) {
        case 'sem_api':
            return 'VITE_API_URL não definida';
        case 'rede':
            return `API Laravel inacessível: ${erro.detalhe}`;
        case 'http':
            return `API Laravel respondeu ${erro.status}`;
        case 'formato':
            return `Resposta da API Laravel fora do contrato: ${erro.detalhe}`;
    }
}

/**
 * Contrato mínimo de query builder que sabe aplicar `.eq()` (satisfeito pelos builders do
 * Supabase).
 */
interface FilterableQuery {
    eq(column: string, value: unknown): FilterableQuery;
}

/**
 * Aplica filtro de posto_id em uma query Supabase
 *
 * @param query - Query builder do Supabase
 * @param postoId - ID do posto (opcional)
 * @returns Query com filtro aplicado
 *
 * @remarks
 * `T` é propositalmente **sem** constraint (`extends FilterableQuery`): o builder real do
 * Supabase tem um tipo genérico profundamente aninhado, e checar essa constraint contra ele em
 * cada call site estourava em "Type instantiation is excessively deep" (TS2589) nos services que
 * usam esta função. A chamada a `.eq()` é feita sobre uma view estrutural (`FilterableQuery`) do
 * mesmo valor, não sobre `T` — daí o cast de volta pro tipo concreto do chamador.
 */
export function withPostoFilter<T>(query: T, postoId?: number): T {
    if (postoId) {
        return (query as FilterableQuery).eq('posto_id', postoId) as T;
    }
    return query;
}

/**
 * Trata erro do Supabase e lança exceção padronizada
 */
export function handleSupabaseError(error: unknown, operacao: string): never {
    console.error(`[API] Erro em ${operacao}:`, error);
    throw error;
}

// Re-exporta supabase para uso interno
export { supabase };
