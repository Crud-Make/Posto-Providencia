/**
 * Utilitários base para services da API
 */

import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { supabase } from '../supabase';
import { lerTokenDaApi } from './token-da-api';

/**
 * Por que uma chamada à API Laravel falhou. União discriminada: quem consome decide pela `tipo`,
 * nunca pela mensagem.
 *
 * `recusado` é a recusa que o servidor explica (#103 P11): 422 com `{ erro: { codigo, mensagem,
 * campos? } }`, seja de forma (`corpo_invalido`, do FormRequest) ou de domínio (`fora_da_janela`,
 * `totais_inconsistentes`, do Command). Um 422 sem esse envelope continua `http`.
 */
export type ErroDaApi =
    | { readonly tipo: 'sem_api' }
    | { readonly tipo: 'rede'; readonly detalhe: string }
    | { readonly tipo: 'http'; readonly status: number }
    | { readonly tipo: 'formato'; readonly detalhe: string }
    | {
          readonly tipo: 'recusado';
          readonly status: number;
          readonly codigo: string;
          readonly mensagem: string;
          readonly campos?: Readonly<Record<string, readonly string[]>>;
      };

/** O envelope de recusa do backend (`RespostaDaGravacao.php`, `GravaFechamentoDoDiaRequest.php`). */
const envelopeDeRecusa = z.object({
    erro: z.object({
        codigo: z.string(),
        mensagem: z.string(),
        campos: z.record(z.string(), z.array(z.string())).optional(),
    }),
});

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
 * O corte do strangler ligado para UMA tela, com o global como padrão.
 *
 * @remarks
 * `VITE_API_URL` liga o corte inteiro de uma vez — é o cutover. Quando se quer acender uma tela
 * só (o ensaio de 27/09/2026 acendeu o Fechamento de Caixa e deixou o resto no Supabase), a tela
 * que fica de fora ganha flag própria com `0` e passa a ler do Supabase mesmo com a URL definida.
 *
 * Flag ausente ou vazia segue o global: é o que mantém o dev como sempre foi — basta
 * `VITE_API_URL` no `.env.local` para tudo usar a API.
 *
 * A URL em si continua saindo de `urlDaApi()`: quem chama decide só QUAL caminho tomar, e o
 * `chamarApi` resolve o endereço. Uma flag por tela que devolvesse a URL teria de ser repetida em
 * todo `*.api.ts`, que é justamente onde o endereço não se escolhe.
 */
/**
 * `true` quando o painel faz login pela própria API (#102) e não pelo Supabase.
 *
 * @remarks Liga só com `VITE_API_LOGIN=1` (ou `true`) E `VITE_API_URL` definida. Ao contrário das
 *          flags de tela, **não** segue o global: enquanto houver tela lendo o Supabase direto, ela
 *          precisa da sessão do Supabase para passar na RLS, e o login pela API não a cria. Ligar
 *          antes de a última tela migrar deixa essas telas vazias.
 */
export function loginPelaApiLigado(): boolean {
    const flag = import.meta.env.VITE_API_LOGIN;
    if (urlDaApi() === null || typeof flag !== 'string') {
        return false;
    }
    const valor = flag.trim().toLowerCase();
    return valor === '1' || valor === 'true';
}

export function corteDaTelaLigado(flag: string | undefined): boolean {
    if (typeof flag !== 'string' || flag.trim() === '') {
        return urlDaApi() !== null;
    }
    const valor = flag.trim().toLowerCase();
    return valor === '1' || valor === 'true';
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
    if (loginPelaApiLigado()) {
        return okAsync(lerTokenDaApi());
    }

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

const descreverFalha = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro));

/**
 * O corpo de uma resposta que não é `ok`: 422 (e 409) com o envelope `{ erro }` vira `recusado`;
 * qualquer outro status, ou 422 sem envelope, vira `http`. Corpo ilegível também é `http` — o
 * status é o que se sabe com certeza.
 */
function recusaOuHttp(resposta: Response): ResultAsync<never, ErroDaApi> {
    const http: ErroDaApi = { tipo: 'http', status: resposta.status };
    if (resposta.status !== 422 && resposta.status !== 409) {
        return errAsync(http);
    }

    return ResultAsync.fromPromise(resposta.json() as Promise<unknown>, (): ErroDaApi => http).andThen((corpo) => {
        const lido = envelopeDeRecusa.safeParse(corpo);
        if (!lido.success) {
            return errAsync<never, ErroDaApi>(http);
        }
        const { codigo, mensagem, campos } = lido.data.erro;
        return errAsync<never, ErroDaApi>(
            campos === undefined
                ? { tipo: 'recusado', status: resposta.status, codigo, mensagem }
                : { tipo: 'recusado', status: resposta.status, codigo, mensagem, campos },
        );
    });
}

/**
 * O miolo comum de toda chamada: token → fetch → ok? → json → safeParse.
 *
 * @remarks
 * O `try/catch` do `fetch` vira `ResultAsync.fromPromise` aqui, na borda — regra de negócio acima
 * disto não lança. A resposta entra como `unknown` e só sai tipada depois do `safeParse`.
 */
function chamarApi<T>(caminho: string, requisicao: (token: string | null) => RequestInit, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    const base = urlDaApi();
    if (base === null) {
        return errAsync({ tipo: 'sem_api' });
    }

    return tokenDaSessao()
        .andThen((token) =>
            ResultAsync.fromPromise(fetch(`${base}${caminho}`, requisicao(token)), (erro): ErroDaApi => ({ tipo: 'rede', detalhe: descreverFalha(erro) })),
        )
        .andThen((resposta) =>
            resposta.status === 204
                ? okAsync<unknown, ErroDaApi>(null)
                : resposta.ok
                ? ResultAsync.fromPromise(resposta.json() as Promise<unknown>, (erro): ErroDaApi => ({ tipo: 'formato', detalhe: descreverFalha(erro) }))
                : recusaOuHttp(resposta),
        )
        .andThen((corpo) => {
            const lido = schema.safeParse(corpo);
            return lido.success
                ? ResultAsync.fromSafePromise(Promise.resolve(lido.data))
                : errAsync<T, ErroDaApi>({ tipo: 'formato', detalhe: lido.error.message });
        });
}

/**
 * GET na API Laravel com a resposta validada por schema.
 *
 * Desde a #103 P5 a requisição leva o `Authorization` da sessão do Supabase, quando existe.
 */
export function buscarNaApi<T>(caminho: string, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    return chamarApi(caminho, (token) => ({ headers: cabecalhos(token) }), schema);
}

/**
 * Escrita na API Laravel (#103 P11): corpo em JSON, resposta validada por schema.
 *
 * @remarks
 * O `corpo` é `unknown` de propósito: quem chama já o montou pelo schema do contrato (ex.:
 * `diaDeclarado` em `fechamento.api.ts`), e aqui só se serializa. Dinheiro e litros vão em string
 * decimal — `JSON.stringify` não toca em string, então nada vira float no caminho.
 */
export function enviarParaApi<T>(caminho: string, metodo: 'PUT' | 'POST', corpo: unknown, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    return chamarApi(
        caminho,
        (token) => ({
            method: metodo,
            headers: { ...cabecalhos(token), 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo),
        }),
        schema,
    );
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
        case 'recusado':
            return `Gravação recusada (${erro.codigo}): ${erro.mensagem}`;
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
