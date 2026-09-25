import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { gravarNaApi, lerDaApi, type ErroDeApi } from '@frentista/shared/api';
import { frentistaSchema, type Frentista } from '../model/schema';

/**
 * O frentista pela API Laravel (#101, fatia 2).
 *
 * @remarks A lista de escolha é lida ANTES do PIN, sem token, e por isso só traz `id` e `nome`: a
 *          foto de cada um não é pública. Aqui ela vira `Frentista` com `foto: null` (a tela mostra as
 *          iniciais); a foto do frentista que tem sessão no aparelho vem do perfil dele.
 */
const paraEscolherSchema = z.object({ data: z.array(z.object({ id: z.number(), nome: z.string() })) });

const perfilSchema = z.object({ data: frentistaSchema });

export function buscarFrentistasParaEscolherPelaApi(postoId: number): ResultAsync<Frentista[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/frentistas/escolha`, null, null, paraEscolherSchema)
    .map((resposta) => resposta.data.map((f) => ({ ...f, foto: null })));
}

/** O perfil do PRÓPRIO frentista do token (`id`, `nome`, `foto`). */
export function buscarPerfilPelaApi(postoId: number, token: string): ResultAsync<Frentista, ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/frentistas/eu`, null, token, perfilSchema).map((resposta) => resposta.data);
}

/**
 * Grava a foto do PRÓPRIO frentista do token. Não há `id` na rota: o A não troca a foto do B — a
 * garantia que o caminho do Supabase (UPDATE anônimo em qualquer linha) não tinha.
 *
 * @param foto Data URL JPEG já reduzida por `reduzirParaAvatar`, ou `null` para voltar às iniciais.
 */
export function salvarFotoPelaApi(postoId: number, token: string, foto: string | null): ResultAsync<void, ErroDeApi> {
  return gravarNaApi(`/api/postos/${postoId}/frentistas/eu/foto`, { foto }, token, perfilSchema).map(() => undefined);
}
