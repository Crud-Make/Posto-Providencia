/**
 * Falhas da borda com o mundo (Supabase, Edge Function), como união discriminada.
 *
 * @remarks Três causas, e cada uma pede uma resposta diferente de quem chama:
 *          - `banco`: o PostgREST respondeu com `{ error }` (RLS, constraint, coluna errada).
 *            `mensagem` é o `error.message` cru — é o texto que o app já mostrava.
 *          - `rede`: a promise rejeitou (sem sinal, fetch abortado) ou a chamada lançou.
 *            `causa` guarda o que foi lançado, sem embrulhar, para a fachada legada poder
 *            relançar o MESMO objeto e o contrato de hoje não mudar.
 *          - `dado_invalido`: a resposta chegou, mas não tem o formato que o schema Zod da
 *            entity exige. Antes entrava por `as unknown as` e explodia longe daqui.
 */
export type ErroDeApi =
  | { readonly tipo: 'banco'; readonly mensagem: string }
  | { readonly tipo: 'rede'; readonly mensagem: string; readonly causa: unknown }
  | { readonly tipo: 'dado_invalido'; readonly mensagem: string };

/**
 * O que foi lançado (ou rejeitado) vira `Err` de rede, com a causa intacta.
 *
 * @remarks Mapeador de `ResultAsync.fromPromise` para a borda inteira: `executar` e as
 *          chamadas que não são consulta do PostgREST (ex.: a consolidação de `@posto/api-core`).
 */
export function erroDeRede(causa: unknown): ErroDeApi {
  return {
    tipo: 'rede',
    mensagem: causa instanceof Error ? causa.message : String(causa),
    causa,
  };
}

/**
 * Trava de exaustividade do `switch` sobre união discriminada: se aparecer um `tipo` novo e
 * alguém esquecer de tratá-lo, o `tsc` reprova aqui.
 *
 * @remarks Lança porque, se chegar a rodar, o tipo mentiu — é defeito de programa, não falha de
 *          negócio. shared/api é a única camada em que `throw` é permitido (RES-1/RES-3).
 */
export function assertUnreachable(valor: never): never {
  throw new Error(`Caso não tratado: ${JSON.stringify(valor)}`);
}

/**
 * Converte o erro da borda na exceção que a fachada legada (`services/api.ts`) sempre lançou.
 *
 * @returns `banco` e `dado_invalido` viram `new Error(mensagem)`, como o `throw new Error(
 *          error.message)` de antes; `rede` devolve a própria `causa`, porque antes a rejeição
 *          do client subia sem embrulho.
 */
export function paraExcecao(erro: ErroDeApi): unknown {
  switch (erro.tipo) {
    case 'banco':
    case 'dado_invalido':
      return new Error(erro.mensagem);
    case 'rede':
      return erro.causa;
    default:
      return assertUnreachable(erro);
  }
}
