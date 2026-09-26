import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { PresencaFrentista } from '@posto/utils';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Presença dos frentistas pela API (`GET /api/postos/{posto}/presencas`, #100 fatia 3). Mesmo
 * formato que o `presencaService` (Supabase) entrega ao card do Dashboard. A rota exige login: é ela
 * que leva a foto, que o catálogo público esconde.
 */
const presencaDaApi = z.object({
    frentista_id: z.number().int(),
    nome: z.string().nullable(),
    foto: z.string().nullable(),
    visto_em: z.string(),
});
const respostaDePresencas = z.object({ data: z.array(presencaDaApi) });

export function lerPresencasDaApi(postoId: number): ResultAsync<PresencaFrentista[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/presencas`, respostaDePresencas).map((resposta) =>
        resposta.data.map((linha) => ({
            frentistaId: linha.frentista_id,
            nome: linha.nome ?? 'Frentista',
            foto: linha.foto,
            vistoEm: new Date(linha.visto_em),
        })),
    );
}
