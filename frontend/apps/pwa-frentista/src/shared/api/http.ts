import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';
import { urlDaApi } from '@frentista/shared/config';
import { erroDeRede, type ErroDeApi } from './erros';

/**
 * Borda HTTP com a API Laravel (#101). O mesmo miolo do `chamarApi` do painel
 * (`apps/web/src/services/api/base.ts`): fetch → ok? → json → safeParse, com toda falha virando
 * `Err` aqui, na borda — de entities para cima ninguém escreve `try` nem `throw` (RES-1/RES-3).
 *
 * O token NÃO é lido aqui: quem chama passa o do frentista (ou nenhum, no login). Dinheiro vai no
 * corpo como string decimal, e `JSON.stringify` não toca em string.
 */

/** O que a API devolve fora do 2xx: `{ erro: { codigo, mensagem } }` (409/422) ou `{ message }` (401/403/404/429). */
const corpoDeRecusa = z.union([
  z.object({ erro: z.object({ codigo: z.string(), mensagem: z.string() }) }),
  z.object({ message: z.string() }),
]);

const MENSAGEM_PADRAO = 'A API recusou o pedido.';

function recusa(resposta: Response): ResultAsync<never, ErroDeApi> {
  const semCorpo: ErroDeApi = { tipo: 'api', status: resposta.status, codigo: null, mensagem: MENSAGEM_PADRAO };
  return ResultAsync.fromPromise(resposta.json() as Promise<unknown>, () => semCorpo).andThen((corpo) => {
    const lido = corpoDeRecusa.safeParse(corpo);
    if (!lido.success) return errAsync<never, ErroDeApi>(semCorpo);
    const erro: ErroDeApi = 'erro' in lido.data
      ? { tipo: 'api', status: resposta.status, codigo: lido.data.erro.codigo, mensagem: lido.data.erro.mensagem }
      : { tipo: 'api', status: resposta.status, codigo: null, mensagem: lido.data.message };
    return errAsync<never, ErroDeApi>(erro);
  });
}

function cabecalhos(token: string | null): Record<string, string> {
  const base = { Accept: 'application/json', 'Content-Type': 'application/json' };
  return token === null ? base : { ...base, Authorization: `Bearer ${token}` };
}

type Metodo = 'GET' | 'POST' | 'PUT';

/**
 * Uma chamada à API Laravel com a resposta validada por schema. 204 chega como `null` ao schema.
 * `GET` vai sem corpo; `POST`/`PUT` levam o corpo em JSON.
 *
 * @returns `Err({ tipo: 'api', status: 0 })` sem `VITE_API_URL`; `Err({ tipo: 'rede' })` quando o
 *          fetch rejeita; `Err({ tipo: 'api', status })` fora do 2xx; `Err({ tipo:
 *          'dado_invalido' })` quando a resposta não bate com o schema.
 */
function chamarApi<T>(metodo: Metodo, caminho: string, corpo: unknown, token: string | null, schema: z.ZodType<T>): ResultAsync<T, ErroDeApi> {
  const base = urlDaApi();
  if (base === null) {
    return errAsync({ tipo: 'api', status: 0, codigo: 'sem_api', mensagem: 'VITE_API_URL não definida.' });
  }

  const init: RequestInit = metodo === 'GET'
    ? { method: metodo, headers: cabecalhos(token) }
    : { method: metodo, headers: cabecalhos(token), body: JSON.stringify(corpo ?? {}) };

  return ResultAsync.fromPromise(fetch(`${base}${caminho}`, init), erroDeRede)
    .andThen((resposta) => {
      if (resposta.status === 204) return okAsync<unknown, ErroDeApi>(null);
      if (!resposta.ok) return recusa(resposta);
      return ResultAsync.fromPromise(resposta.json() as Promise<unknown>, erroDeRede);
    })
    .andThen((dado) => {
      const lido = schema.safeParse(dado);
      return lido.success
        ? okAsync<T, ErroDeApi>(lido.data)
        : errAsync<T, ErroDeApi>({ tipo: 'dado_invalido', mensagem: `Resposta da API fora do formato: ${lido.error.message}` });
    });
}

/** `POST` na API Laravel (ver {@link chamarApi}). */
export function postarNaApi<T>(caminho: string, corpo: unknown, token: string | null, schema: z.ZodType<T>): ResultAsync<T, ErroDeApi> {
  return chamarApi('POST', caminho, corpo, token, schema);
}

/** `PUT` na API Laravel (ver {@link chamarApi}). */
export function gravarNaApi<T>(caminho: string, corpo: unknown, token: string | null, schema: z.ZodType<T>): ResultAsync<T, ErroDeApi> {
  return chamarApi('PUT', caminho, corpo, token, schema);
}

/**
 * `GET` na API Laravel (ver {@link chamarApi}). A query vai montada por `URLSearchParams` — quem
 * chama passa os parâmetros, nunca a string pronta.
 */
export function lerDaApi<T>(caminho: string, query: Record<string, string> | null, token: string | null, schema: z.ZodType<T>): ResultAsync<T, ErroDeApi> {
  const busca = query === null ? '' : `?${new URLSearchParams(query).toString()}`;
  return chamarApi('GET', `${caminho}${busca}`, null, token, schema);
}
