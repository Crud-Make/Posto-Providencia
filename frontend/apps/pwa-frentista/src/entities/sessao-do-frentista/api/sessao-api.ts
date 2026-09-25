import type { ResultAsync } from 'neverthrow';
import { postarNaApi, type ErroDeApi } from '@frentista/shared/api';
import { guardarSessao } from '../lib/sessao-guardada';
import { sessaoDoFrentistaSchema, type SessaoDoFrentista } from '../model/schema';

/**
 * Entra com o PIN do frentista (#101) e guarda a sessão no aparelho.
 *
 * @remarks PIN errado, frentista inativo ou de outro posto voltam como o MESMO `Err` (401,
 *          "Frentista ou PIN incorretos.") — a API não diz qual, e a tela também não. O PIN vai
 *          como texto: `'0123'` não pode virar `123`.
 */
export function entrarComPin(postoId: number, frentistaId: number, pin: string): ResultAsync<SessaoDoFrentista, ErroDeApi> {
  return postarNaApi(`/api/postos/${postoId}/frentistas/entrar`, { frentista_id: frentistaId, pin }, null, sessaoDoFrentistaSchema)
    .map((sessao) => {
      guardarSessao(sessao);
      return sessao;
    });
}
