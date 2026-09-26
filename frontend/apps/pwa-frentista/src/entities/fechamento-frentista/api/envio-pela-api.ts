import type { ResultAsync } from 'neverthrow';
import { postarNaApi, type ErroDeApi } from '@frentista/shared/api';
import { envioRegistradoSchema, paraEnvioDaApi, type EnvioRegistrado, type ValoresDoTurno } from '../model/envio-pela-api';

/**
 * Envia o fechamento do turno pela API (#101). O servidor acha ou cria o pai do dia, grava a linha
 * com o frentista do TOKEN e reconsolida o pai, numa transação só.
 *
 * @param chave UUID desta tentativa. Repetir o MESMO envio com a mesma chave (a rede caiu depois
 *              de gravar) devolve a linha já gravada, sem duplicar; quem chama só troca a chave
 *              quando os valores mudam.
 * @returns `Err({ tipo: 'api', status: 401 })` sem sessão válida (pedir o PIN de novo);
 *          `409 ja_enviado` quando o frentista já enviou o dia.
 */
export function enviarTurnoPelaApi(
  postoId: number,
  token: string,
  data: string,
  chave: string,
  valores: ValoresDoTurno,
): ResultAsync<EnvioRegistrado, ErroDeApi> {
  return postarNaApi(`/api/postos/${postoId}/envios`, paraEnvioDaApi(data, chave, valores), token, envioRegistradoSchema)
    .map((resposta) => resposta.data);
}
