/**
 * O cliente HTTP do app do dono para a API Laravel: token → fetch → status → JSON → schema.
 *
 * @remarks Espelha o `base.ts` do painel (`buscarNaApi`/`enviarParaApi`, `ErroDaApi`, o envelope
 *          `{ erro: { codigo, mensagem } }` do 422/409), sem importá-lo: app não importa outro app
 *          (FSD-5). A resposta entra como `unknown` e só sai tipada depois do `safeParse` — número
 *          cru onde o contrato diz string decimal é resposta fora do contrato, não dado a converter.
 *
 *          **401 com token = sessão acabou.** O token morreu (revogado, vencido, servidor
 *          reiniciado sem ele): o cliente o esquece e avisa o App, que volta para a tela de entrada.
 *          401 SEM token é só o login recusado, e não derruba nada.
 */
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { lerToken, MENSAGEM_SESSAO_ACABOU, perderSessao } from './sessao';

/** Por que uma chamada falhou. Quem consome decide pelo `tipo`, nunca pela mensagem. */
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
      };

/** Decimal em string, como o Laravel serializa `numeric` (cast `decimal:N`). */
export const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

const envelopeDeRecusa = z.object({
    erro: z.object({ codigo: z.string(), mensagem: z.string() }),
});

/** Base da API (`VITE_API_URL`, sem barra no fim), ou `null` quando não foi configurada. */
export function urlDaApi(): string | null {
    const url: unknown = import.meta.env.VITE_API_URL;
    return typeof url === 'string' && url.trim() !== '' ? url.trim().replace(/\/+$/, '') : null;
}

const descreverFalha = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro));

function cabecalhos(token: string | null, comCorpo: boolean): Record<string, string> {
    const base: Record<string, string> = { Accept: 'application/json' };
    if (comCorpo) base['Content-Type'] = 'application/json';
    if (token !== null) base.Authorization = `Bearer ${token}`;
    return base;
}

/** 422/409 com o envelope `{ erro }` vira `recusado`; qualquer outro status, `http`. */
function recusaOuHttp(resposta: Response, levouToken: boolean): ResultAsync<never, ErroDaApi> {
    const http: ErroDaApi = { tipo: 'http', status: resposta.status };
    if (resposta.status === 401 && levouToken) {
        perderSessao(MENSAGEM_SESSAO_ACABOU);
    }
    if (resposta.status !== 422 && resposta.status !== 409) {
        return errAsync(http);
    }
    return ResultAsync.fromPromise(resposta.json() as Promise<unknown>, (): ErroDaApi => http).andThen((corpo) => {
        const lido = envelopeDeRecusa.safeParse(corpo);
        return lido.success
            ? errAsync<never, ErroDaApi>({ tipo: 'recusado', status: resposta.status, ...lido.data.erro })
            : errAsync<never, ErroDaApi>(http);
    });
}

interface Pedido {
    readonly metodo: 'GET' | 'POST' | 'PUT';
    readonly corpo?: unknown;
    /** Token desta chamada, fora da sessão (o `POST /sair` da conta recusada). Ausente = o da sessão. */
    readonly token?: string | null;
}

/** O miolo comum: nenhuma exceção sai daqui, só `ResultAsync`. */
export function chamarApi<T>(caminho: string, pedido: Pedido, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    const base = urlDaApi();
    if (base === null) return errAsync({ tipo: 'sem_api' });

    const token = pedido.token === undefined ? lerToken() : pedido.token;
    const comCorpo = pedido.corpo !== undefined;
    const init: RequestInit = { method: pedido.metodo, headers: cabecalhos(token, comCorpo) };
    if (comCorpo) init.body = JSON.stringify(pedido.corpo);

    return ResultAsync.fromPromise(fetch(`${base}${caminho}`, init), (erro): ErroDaApi => ({ tipo: 'rede', detalhe: descreverFalha(erro) }))
        .andThen((resposta) => {
            if (resposta.status === 204) return okAsync<unknown, ErroDaApi>(null);
            if (!resposta.ok) return recusaOuHttp(resposta, token !== null);
            return ResultAsync.fromPromise(resposta.json() as Promise<unknown>, (erro): ErroDaApi => ({ tipo: 'formato', detalhe: descreverFalha(erro) }));
        })
        .andThen((corpo) => {
            const lido = schema.safeParse(corpo);
            return lido.success ? okAsync<T, ErroDaApi>(lido.data) : errAsync<T, ErroDaApi>({ tipo: 'formato', detalhe: lido.error.message });
        });
}

export function buscarNaApi<T>(caminho: string, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    return chamarApi(caminho, { metodo: 'GET' }, schema);
}

export function enviarParaApi<T>(caminho: string, metodo: 'POST' | 'PUT', corpo: unknown, schema: z.ZodType<T>): ResultAsync<T, ErroDaApi> {
    return chamarApi(caminho, { metodo, corpo }, schema);
}

/** A frase que as telas mostram para cada falha de leitura ou gravação. */
export function mensagemDoErro(erro: ErroDaApi): string {
    switch (erro.tipo) {
        case 'sem_api':
            return 'O endereço do servidor não foi configurado (VITE_API_URL).';
        case 'rede':
            return 'Não foi possível falar com o servidor. Confira a internet.';
        case 'formato':
            return 'O servidor respondeu num formato inesperado. Avise o suporte.';
        case 'recusado':
            return erro.mensagem;
        case 'http':
            if (erro.status === 401) return MENSAGEM_SESSAO_ACABOU;
            if (erro.status === 403) return 'Esta conta não tem permissão para isso neste posto.';
            if (erro.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
            return `O servidor respondeu ${erro.status}. Tente de novo.`;
    }
}

/**
 * A ponte para as telas, que falam `Promise`: o erro vira `Error` com a frase pronta.
 *
 * @remarks As telas já tratam `catch (err) → err.message` desde o tempo do Supabase; manter essa
 *          forma é o que deixa os testes delas valendo sem reescrita.
 */
export async function ouLancar<T>(resultado: ResultAsync<T, ErroDaApi>): Promise<T> {
    const lido = await resultado;
    if (lido.isErr()) throw new Error(mensagemDoErro(lido.error));
    return lido.value;
}
