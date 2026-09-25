import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { decimalDaApi, gravarNaApi, lerDaApi, type ErroDeApi } from '@frentista/shared/api';
import { medicaoParaGravarSchema, tanqueSchema, type MedicaoDoDia, type Tanque } from '../model/schema';

/**
 * A tela de régua pela API Laravel (#101, fatia 2). O servidor aplica a janela de escrita e confere
 * que o tanque é do posto — as travas que no Supabase eram policy.
 */
const tanquesSchema = z.object({ data: z.array(tanqueSchema) });

const medicaoSchema = z.object({ tanque_id: z.number(), data: z.string(), volume_fisico: decimalDaApi.nullable() });

const medicoesSchema = z.object({ data: z.array(medicaoSchema) });

const gravadaSchema = z.object({ data: medicaoSchema });

/** Mesmos textos de `tanque-api.ts`: o frentista não precisa saber por qual caminho o dado foi. */
const MEDICAO_BARRADA = 'A medição não foi gravada (barrada pela segurança do banco). Avise o gerente.';
const MEDICAO_INVALIDA = 'Confira o tanque, a data e os litros: esse valor não pode ser gravado.';

export function buscarTanquesPelaApi(postoId: number, token: string): ResultAsync<Tanque[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/regua/tanques`, null, token, tanquesSchema).map((resposta) => resposta.data);
}

/** Medições já gravadas no dia, só dos tanques deste posto. */
export function buscarMedicoesDoDiaPelaApi(postoId: number, token: string, data: string): ResultAsync<MedicaoDoDia[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/regua/medicoes`, { data }, token, medicoesSchema)
    .map((resposta) => resposta.data.map(({ tanque_id, volume_fisico }) => ({ tanque_id, volume_fisico })));
}

/**
 * Grava a medição (upsert por tanque e dia). Antes da rede, o mesmo `medicaoParaGravarSchema` do
 * caminho do Supabase; depois, a mesma conferência: o volume que o servidor diz ter gravado tem de
 * ser o digitado.
 */
export function salvarMedicaoPelaApi(postoId: number, token: string, tanqueId: number, dataStr: string, volumeFisico: number): ResultAsync<void, ErroDeApi> {
  const medicao = medicaoParaGravarSchema.safeParse({ tanque_id: tanqueId, data: dataStr, volume_fisico: volumeFisico });
  if (!medicao.success) {
    return errAsync<void, ErroDeApi>({ tipo: 'dado_invalido', mensagem: MEDICAO_INVALIDA });
  }

  const corpo = { tanque_id: tanqueId, data: dataStr, volume_fisico: String(volumeFisico) };
  return gravarNaApi(`/api/postos/${postoId}/regua/medicoes`, corpo, token, gravadaSchema).andThen((resposta) =>
    resposta.data.volume_fisico === volumeFisico
      ? okAsync<void, ErroDeApi>(undefined)
      : errAsync<void, ErroDeApi>({ tipo: 'banco', mensagem: MEDICAO_BARRADA }),
  );
}
