import type { ErroDeApi } from '@frentista/shared/api';

/** O código com que a API recusa o primeiro acesso de quem já tem chave (409). */
export const JA_TEM_CHAVE = 'ja_tem_chave';

/** `true` quando a recusa é "este frentista já tem chave" — a tela passa para o PIN. */
export function jaTemChave(erro: ErroDeApi): boolean {
  return erro.tipo === 'api' && erro.status === 409 && erro.codigo === JA_TEM_CHAVE;
}

/**
 * O que a tela "Crie sua chave" mostra para cada falha do primeiro acesso (27/09/2026).
 *
 * @remarks 409 é a mensagem do servidor ("Este frentista já tem chave. Peça ao gerente para
 *          zerar."). 404 é uma só para frentista de outro posto, inativo ou inexistente.
 */
export function mensagemDaChave(erro: ErroDeApi): string {
  if (erro.tipo === 'rede') return 'Sem conexão com o servidor. Tente de novo.';
  if (erro.tipo !== 'api') return 'O servidor respondeu fora do esperado. Tente de novo.';
  if (erro.status === 404) return 'Frentista não encontrado neste posto. Fale com o gerente.';
  if (erro.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (erro.status === 422) return 'A chave tem de 4 a 6 números, igual nos dois campos.';
  return erro.mensagem;
}
