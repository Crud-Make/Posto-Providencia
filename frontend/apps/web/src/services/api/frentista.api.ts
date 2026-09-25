import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Frentista } from '../../types/database/index';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Contrato de `GET /api/postos/{posto}/frentistas` — espelha
 * `backend/app/Cadastro/Http/Resources/FrentistaResource.php`.
 *
 * @remarks
 * `turno` (aninhado) fica fora do schema de propósito: o fechamento diário não o lê, e o
 * `z.object` descarta chave desconhecida. `data_admissao` chega como ISO em UTC
 * (`2026-01-27T00:00:00.000000Z`), que é o que o cast `datetime` do model serializa.
 */
const frentistaDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    telefone: z.string().nullable(),
    data_admissao: z.string(),
    ativo: z.boolean(),
    turno_id: z.number().int().nullable(),
});

const respostaDeFrentistas = z.object({ data: z.array(frentistaDaApi) });

export type FrentistaDaApi = z.infer<typeof frentistaDaApi>;

/**
 * Converte a resposta da API na mesma lista que o Supabase devolve em `frentistaService.getAll`.
 *
 * @remarks
 * Paridade com a query antiga (`.eq('ativo', true)`, `.order('nome')`): a API não filtra `ativo`
 * (`CatalogoDoPosto::frentistas`) e já ordena por `nome`, então o filtro fica aqui e a ordem é
 * mantida. `posto_id` não sai no Resource; vem do posto pedido, que é o escopo da própria rota.
 *
 * `cpf` e `user_id` não saem no Resource (`FrentistaResource.php:17-25`) e ficam `null`: o
 * fechamento diário lê só `id`, `nome` e `ativo`. Quem precisar deles pela API amplia o Resource,
 * não este mapeamento. `foto` e `created_at` são opcionais no tipo e ficam de fora.
 */
export function paraFrentistasAtivos(lidos: readonly FrentistaDaApi[], postoId: number): Frentista[] {
    return lidos
        .filter((frentista) => frentista.ativo)
        .map((frentista) => ({
            id: frentista.id,
            nome: frentista.nome,
            cpf: null,
            telefone: frentista.telefone,
            data_admissao: frentista.data_admissao,
            ativo: frentista.ativo,
            user_id: null,
            turno_id: frentista.turno_id,
            posto_id: postoId,
        }));
}

/** Frentistas ativos do posto, lidos da API Laravel. */
export function lerFrentistasDaApi(postoId: number): ResultAsync<Frentista[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/frentistas`, respostaDeFrentistas)
        .map((resposta) => paraFrentistasAtivos(resposta.data, postoId));
}

/**
 * `Frentista.id → nome` de TODOS os frentistas do posto, ativos ou não.
 *
 * @remarks Para o resumo mensal da aba Detalhamento: o Supabase trazia o nome pelo join
 *          `frentista:Frentista(*)`, que não filtra `ativo` — quem saiu no meio do mês continua com
 *          nome na coluna dele. Por isso aqui não se passa por `paraFrentistasAtivos`.
 */
export function lerNomesDosFrentistasDaApi(postoId: number): ResultAsync<ReadonlyMap<number, string>, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/frentistas`, respostaDeFrentistas).map(
        (resposta): ReadonlyMap<number, string> => new Map(resposta.data.map((frentista) => [frentista.id, frentista.nome] as const)),
    );
}
