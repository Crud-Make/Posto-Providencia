import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { executar, postarNaApi, supabase, validar, type ErroDeApi } from '@frentista/shared/api';
import { listaDeFrentistasSchema, type Frentista } from '../model/schema';

/**
 * Frentistas ativos do posto, por nome.
 *
 * @returns A lista validada (ou `null`, como o client pode devolver).
 */
export function buscarFrentistasAtivos(postoId: number): ResultAsync<Frentista[] | null, ErroDeApi> {
  return executar(() =>
    supabase
      .from('Frentista')
      .select('id, nome, foto')
      .eq('posto_id', postoId)
      .eq('ativo', true)
      .order('nome'),
  ).andThen(validar(listaDeFrentistasSchema, 'Frentista (ativos do posto)'));
}

/**
 * Grava o avatar do frentista.
 *
 * @param foto Data URL JPEG já recortada e reduzida por `reduzirParaAvatar`.
 *             Passe `null` para voltar à inicial do nome.
 * @remarks Só o frentista escolhido no aparelho chega aqui — mas isso é
 *          regra de tela, não do banco: o client é `anon` e a policy
 *          "Enable Update for Anon on Frentista" libera UPDATE em qualquer
 *          linha. A garantia real depende do login por frentista sobre
 *          `Frentista.user_id`, que ainda não foi ligado.
 */
export function salvarFotoDoFrentista(frentistaId: number, foto: string | null): ResultAsync<void, ErroDeApi> {
  return executar(() =>
    supabase
      .from('Frentista')
      .update({ foto })
      .eq('id', frentistaId),
  ).map(() => undefined);
}

/**
 * Sinal de vida: registra que o app está aberto com este frentista selecionado.
 *
 * @remarks
 * `visto_em` **não** é enviado de propósito — um trigger no banco carimba com
 * o relógio do servidor. O celular do frentista com a hora errada colocaria
 * ele no futuro e o painel o mostraria online para sempre.
 *
 * A falha volta como `Err`; quem decide engolir (presença é conveniência) é o chamador —
 * hoje a fachada `services/api.ts`, que só registra o aviso no console.
 */
export function marcarPresencaDoFrentista(frentistaId: number, postoId: number): ResultAsync<void, ErroDeApi> {
  return executar(() =>
    supabase
      .from('PresencaFrentista')
      .upsert({ frentista_id: frentistaId, posto_id: postoId }, { onConflict: 'frentista_id' }),
  ).map(() => undefined);
}

/**
 * Sinal de vida pela API (#101): o frentista é o do TOKEN, e `visto_em` é a hora do servidor
 * (trigger `carimba_visto_em`), como no caminho do Supabase. A resposta é 204.
 */
export function marcarPresencaPelaApi(postoId: number, token: string): ResultAsync<void, ErroDeApi> {
  return postarNaApi(`/api/postos/${postoId}/presenca`, {}, token, z.null()).map(() => undefined);
}
