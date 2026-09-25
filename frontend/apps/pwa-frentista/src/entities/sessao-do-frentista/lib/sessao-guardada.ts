import { apagarDoAparelho, gravarNoAparelho, lerJsonDoAparelho } from '@frentista/shared/api';
import { sessaoDoFrentistaSchema, type SessaoDoFrentista } from '../model/schema';

/** Chave do `localStorage` onde a sessão do frentista sobrevive ao recarregar a página. */
export const CHAVE_SESSAO = 'pwa.sessaoFrentista';

/**
 * A sessão guardada no aparelho, se for DESTE frentista e ainda não venceu; senão `null`.
 *
 * @remarks Uma sessão por aparelho: trocar de frentista pede o PIN do novo. O vencimento é
 *          conferido aqui só para não mandar à API um token que ela certamente recusa — quem decide
 *          de verdade é o servidor (401).
 */
export function sessaoGuardada(frentistaId: number, agora: number = Date.now()): SessaoDoFrentista | null {
  const lido = sessaoDoFrentistaSchema.safeParse(lerJsonDoAparelho(CHAVE_SESSAO));
  if (!lido.success || lido.data.frentista.id !== frentistaId) return null;

  const vence = Date.parse(lido.data.vence_em);
  return Number.isFinite(vence) && vence > agora ? lido.data : null;
}

/**
 * A sessão guardada no aparelho, de QUALQUER frentista, se ainda não venceu; senão `null`.
 *
 * @remarks Para as leituras que não são de um frentista (tanques, produtos, envios do dia): a API
 *          exige um token de frentista do posto, e o do aparelho serve. Dado pessoal (histórico,
 *          foto, vendas do frentista) usa {@link sessaoGuardada}, que confere o frentista.
 */
export function sessaoDoAparelho(agora: number = Date.now()): SessaoDoFrentista | null {
  const lido = sessaoDoFrentistaSchema.safeParse(lerJsonDoAparelho(CHAVE_SESSAO));
  if (!lido.success) return null;
  return sessaoGuardada(lido.data.frentista.id, agora);
}

export function guardarSessao(sessao: SessaoDoFrentista): void {
  gravarNoAparelho(CHAVE_SESSAO, JSON.stringify(sessao));
}

export function esquecerSessao(): void {
  apagarDoAparelho(CHAVE_SESSAO);
}
