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
    .map((sessao) => guardarNoPosto(sessao, postoId));
}

/**
 * Primeiro acesso (27/09/2026): o frentista que ainda não tem chave cria o PRÓPRIO PIN, e já sai com
 * a sessão, como no `entrarComPin`.
 *
 * @remarks Recusas da API: 409 `ja_tem_chave` ("Este frentista já tem chave. Peça ao gerente para
 *          zerar."), 404 (frentista não é deste posto, está inativo ou não existe — uma resposta só),
 *          422 (PIN fora do formato ou confirmação diferente).
 */
export function criarChave(postoId: number, frentistaId: number, pin: string, confirmacao: string): ResultAsync<SessaoDoFrentista, ErroDeApi> {
  const corpo = { frentista_id: frentistaId, pin, pin_confirmacao: confirmacao };
  return postarNaApi(`/api/postos/${postoId}/frentistas/primeiro-acesso`, corpo, null, sessaoDoFrentistaSchema)
    .map((sessao) => guardarNoPosto(sessao, postoId));
}

/** Guarda a sessão carimbada com o posto em que foi aberta (ver `sessaoEhDoPosto`). */
function guardarNoPosto(sessao: SessaoDoFrentista, postoId: number): SessaoDoFrentista {
  const doPosto = { ...sessao, posto_id: postoId };
  guardarSessao(doPosto);
  return doPosto;
}
