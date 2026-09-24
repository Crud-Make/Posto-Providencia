import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { executar, supabase, validar, type ErroDeApi } from '@frentista/shared/api';
import {
  listaDeTanquesSchema,
  medicaoRelidaSchema,
  medicoesDoDiaSchema,
  type MedicaoDoDia,
  type Tanque,
} from '../model/schema';

/** Texto que o frentista vê quando a gravação some sem erro (RLS silenciosa). */
const MEDICAO_BARRADA = 'A medição não foi gravada (barrada pela segurança do banco). Avise o gerente.';

/** Tanques do posto com o combustível, por id. */
export function buscarTanques(postoId: number): ResultAsync<Tanque[], ErroDeApi> {
  return executar(() =>
    supabase
      .from('Tanque')
      .select('id, combustivel:Combustivel(nome, codigo)')
      .eq('posto_id', postoId)
      .order('id'),
  )
    .andThen(validar(listaDeTanquesSchema, 'Tanque (do posto)'))
    .map((linhas) => linhas ?? []);
}

/** Medições de régua já gravadas no dia — para avisar que reenvio substitui. */
export function buscarMedicoesDoDia(dataStr: string): ResultAsync<MedicaoDoDia[], ErroDeApi> {
  return executar(() =>
    supabase
      .from('HistoricoTanque')
      .select('tanque_id, volume_fisico')
      .eq('data', dataStr),
  )
    .andThen(validar(medicoesDoDiaSchema, 'HistoricoTanque (medições do dia)'))
    .map((linhas) => linhas ?? []);
}

/**
 * Grava a medição de régua de um tanque (upsert por tanque+dia, #74).
 *
 * @remarks Com o client anon, escrita barrada pela RLS pode voltar SEM
 *          erro — o mesmo silêncio já documentado do reset. Depois de
 *          gravar, reconsulta e confere o valor; se não bateu, erro
 *          explícito (regra herdada de `packages/api-core`).
 */
export function salvarMedicao(tanqueId: number, dataStr: string, volumeFisico: number): ResultAsync<void, ErroDeApi> {
  return executar(() =>
    supabase
      .from('HistoricoTanque')
      .upsert(
        { tanque_id: tanqueId, data: dataStr, volume_fisico: volumeFisico },
        { onConflict: 'tanque_id, data' },
      ),
  )
    .andThen(() =>
      executar(() =>
        supabase
          .from('HistoricoTanque')
          .select('volume_fisico')
          .eq('tanque_id', tanqueId)
          .eq('data', dataStr)
          .single(),
      ),
    )
    .andThen(validar(medicaoRelidaSchema, 'HistoricoTanque (releitura da medição)'))
    .andThen((gravado) => {
      if (gravado === null || Number(gravado.volume_fisico) !== volumeFisico) {
        return errAsync<void, ErroDeApi>({ tipo: 'banco', mensagem: MEDICAO_BARRADA });
      }
      return okAsync<void, ErroDeApi>(undefined);
    });
}
