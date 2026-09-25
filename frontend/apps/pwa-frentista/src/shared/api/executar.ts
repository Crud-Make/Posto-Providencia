import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { erroDeRede, type ErroDeApi } from './erros';

/** O mínimo que toda resposta do client do Supabase (PostgREST ou Edge Function) tem. */
export interface RespostaDoSupabase {
  readonly data: unknown;
  readonly error: { readonly message: string } | null;
}

/**
 * Roda uma chamada ao Supabase e devolve `ResultAsync`, em vez de promise que lança.
 *
 * @param chamada Função que monta e devolve a consulta (`() => supabase.from(...)...`). É
 *                função, e não a consulta pronta, para que um `throw` síncrono do client
 *                também vire `Err` em vez de escapar.
 * @returns `Ok(data)` quando `error` é nulo; `Err({ tipo: 'banco' })` quando o PostgREST
 *          devolve `{ error }`; `Err({ tipo: 'rede' })` quando a promise rejeita ou a
 *          chamada lança.
 *
 * @remarks É o único ponto do app em que a falha do mundo externo vira valor. Daqui para
 *          cima (entities, features) ninguém escreve `try` nem `throw` (RES-1/RES-3).
 *          O `data` sai como `unknown` de propósito: o client não é tipado com o Database
 *          gerado, e quem diz o formato é o schema Zod da entity (`validar`), não um cast.
 */
export function executar(chamada: () => PromiseLike<RespostaDoSupabase>): ResultAsync<unknown, ErroDeApi> {
  return ResultAsync.fromPromise(
    new Promise<RespostaDoSupabase>((resolver) => { resolver(chamada()); }),
    erroDeRede,
  ).andThen((resposta) =>
    resposta.error === null
      ? okAsync<unknown, ErroDeApi>(resposta.data)
      : errAsync<unknown, ErroDeApi>({ tipo: 'banco', mensagem: resposta.error.message }),
  );
}
