import type { ErroDeApi } from '@frentista/shared/api';

/** O PIN aceito pela API: 4 a 6 dígitos (`DefinePinDoFrentista::FORMATO` no backend). */
export const FORMATO_DO_PIN = /^\d{4,6}$/;

/**
 * O que a tela do PIN mostra para cada falha do login (#101).
 *
 * @remarks 401 é UMA mensagem só: a API não diz se o PIN está errado, se o frentista foi
 *          desativado ou se é de outro posto, e a tela também não.
 */
export function mensagemDoLogin(erro: ErroDeApi): string {
  if (erro.tipo === 'rede') return 'Sem conexão com o servidor. Tente de novo.';
  if (erro.tipo !== 'api') return 'O servidor respondeu fora do esperado. Tente de novo.';
  if (erro.status === 401) return 'PIN incorreto.';
  if (erro.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (erro.status === 422) return 'O PIN tem de 4 a 6 números.';
  return erro.mensagem;
}
