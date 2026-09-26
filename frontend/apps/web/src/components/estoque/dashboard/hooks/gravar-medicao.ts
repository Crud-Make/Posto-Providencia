/**
 * A "Nova Medição (Régua)" pela fonte ligada. A régua vai para `HistoricoTanque.volume_fisico` do
 * dia e só para lá: é dela que o estoque atual é derivado (upsert por tanque e dia; o
 * `volume_livro` do dia não é tocado).
 *
 *  - API (`VITE_API_TANQUES`): `PUT /tanques/medicoes`, a MESMA regra da régua do PWA no servidor
 *    (janela de escrita, tanque do posto). O volume vai como `String(numero)` — o texto que o
 *    `JSON.stringify` do supabase-js mandava — e o `numeric(10,2)` arredonda no banco, como antes.
 *  - Supabase: `tanqueService.saveHistory`, como sempre.
 */
import { errAsync, ResultAsync } from 'neverthrow';
import { tanqueService } from '../../../../services/api';
import { descreverErroDaApi } from '../../../../services/api/base';
import { gravarMedicaoNaApi, medicaoDoPainel, tanquesPelaApi } from '../../../../services/api/tanques.api';

function pelaApi(postoId: number, tanqueId: number, dia: string, volume: number): ResultAsync<void, string> {
    const corpo = medicaoDoPainel.safeParse({ tanque_id: tanqueId, data: dia, volume_fisico: String(volume) });
    if (!corpo.success) return errAsync('Valor de medição fora do formato aceito.');
    return gravarMedicaoNaApi(postoId, corpo.data).map(() => undefined).mapErr(descreverErroDaApi);
}

function peloSupabase(tanqueId: number, dia: string, volume: number): ResultAsync<void, string> {
    return ResultAsync.fromPromise(
        tanqueService.saveHistory({ tanque_id: tanqueId, data: dia, volume_fisico: volume }),
        (erro) => (erro instanceof Error ? erro.message : String(erro)),
    ).andThen((resposta) => (resposta.success ? ResultAsync.fromSafePromise(Promise.resolve(undefined)) : errAsync(resposta.error)));
}

export function gravarMedicao(postoId: number, tanqueId: number, dia: string, volume: number): ResultAsync<void, string> {
    return tanquesPelaApi() ? pelaApi(postoId, tanqueId, dia, volume) : peloSupabase(tanqueId, dia, volume);
}
