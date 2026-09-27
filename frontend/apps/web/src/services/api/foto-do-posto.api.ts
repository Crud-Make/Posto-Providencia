import { z } from 'zod';
import type { ResultAsync } from 'neverthrow';
import { enviarParaApi, urlDaApi, type ErroDaApi } from './base';
import type { PerfilDaApi } from './sessao.api';

/**
 * A foto da fachada do posto (27/09/2026). Quem troca é o gerente ou o admin daquele posto; a
 * lista pública de postos traz só o caminho versionado da imagem, e a imagem vem de
 * `GET /api/postos/{id}/foto`, com cache longo (o `?v=` muda quando a foto muda).
 */

/** Limite do servidor para o data URL (`CHECK` no banco e `max` no FormRequest). */
export const TAMANHO_MAXIMO_DA_FOTO = 300_000;

const respostaDaTroca = z.object({ data: z.object({ foto: z.string().nullable() }) });

/** Grava (ou, com `null`, remove) a foto do posto. Devolve o novo caminho versionado. */
export function trocarFotoDoPosto(postoId: number, foto: string | null): ResultAsync<string | null, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/foto`, 'PUT', { foto }, respostaDaTroca).map((r) => r.data.foto);
}

/** O caminho que a API devolve vira endereço completo — a API mora em outro domínio que o painel. */
export function enderecoDaFoto(caminho: string | null): string | null {
    if (caminho === null) return null;
    const base = urlDaApi();
    return base === null ? null : `${base}${caminho}`;
}

/**
 * Quem pode trocar a foto do posto: o admin da rede, ou quem é GERENTE/ADMIN daquele posto — a mesma
 * regra do `gerir` do servidor (PostoPolicy), que é quem decide de verdade.
 */
export function podeTrocarFotoDoPosto(usuario: PerfilDaApi | null, postoId: number): boolean {
  if (usuario === null) return false;
  if (usuario.role.toUpperCase() === 'ADMIN') return true;
  // O papel no posto vem em minúsculas da API (`gerente`, enum PapelNoPosto); o `role` da conta, em
  // maiúsculas. Compara sem caixa para não depender de nenhum dos dois.
  const papel = usuario.postos.find((p) => p.id === postoId)?.papel.toUpperCase();
  return papel === 'GERENTE' || papel === 'ADMIN';
}
