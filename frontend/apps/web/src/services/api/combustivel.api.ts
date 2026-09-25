import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * `Combustivel.id → codigo` pelo catálogo da API (`GET /api/postos/{posto}/combustiveis`, #97).
 *
 * @remarks Só o que o Dashboard precisa: o `codigo` dá a cor do produto (`corDoProduto`). Antes da
 *          fatia 3 da #100 vinha do Supabase, e sem a sessão dele (login pela API) o gráfico ficava
 *          sem cor. Inativo entra também: venda antiga de combustível desativado mantém a cor.
 */
const combustivelDaApi = z.object({ id: z.number().int(), codigo: z.string() });
const respostaDeCombustiveis = z.object({ data: z.array(combustivelDaApi) });

export function lerCodigosDeCombustivelDaApi(postoId: number): ResultAsync<ReadonlyMap<number, string>, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/combustiveis`, respostaDeCombustiveis).map(
        (resposta): ReadonlyMap<number, string> => new Map(resposta.data.map((c) => [c.id, c.codigo] as const)),
    );
}

const nomeDeCombustivel = z.object({ id: z.number().int(), nome: z.string() });
const respostaDeNomes = z.object({ data: z.array(nomeDeCombustivel) });

/**
 * `Combustivel.id → nome` pelo catálogo, inativos inclusive — a aba Fechamento Mensal classifica os
 * litros do dia por nome, como a RPC `get_fechamento_mensal` fazia (`fechamentoMensal.api.ts`).
 */
export function lerNomesDeCombustivelDaApi(postoId: number): ResultAsync<ReadonlyMap<number, string>, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/combustiveis`, respostaDeNomes).map(
        (resposta): ReadonlyMap<number, string> => new Map(resposta.data.map((c) => [c.id, c.nome] as const)),
    );
}

const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');
const combustivelComPreco = z.object({ id: z.number().int(), nome: z.string(), codigo: z.string(), preco_venda: decimalEmString });
const respostaComPreco = z.object({ data: z.array(combustivelComPreco) });

/** Combustível do catálogo com o preço de bomba atual, já em número. */
export interface CombustivelComPreco {
    readonly id: number;
    readonly nome: string;
    readonly codigo: string;
    readonly precoVenda: number;
}

/**
 * Catálogo de combustíveis com nome, código e preço de bomba, inativos inclusive — a lista de
 * produtos da Análise de Custos no modo API (o `Estoque` que o caminho Supabase lê não tem rota, e
 * é 1:1 com `Combustivel`). `preco_venda` chega como string decimal (`decimal:2` no model).
 */
export function lerCombustiveisComPrecoDaApi(postoId: number): ResultAsync<readonly CombustivelComPreco[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/combustiveis`, respostaComPreco).map((resposta) =>
        resposta.data.map((c) => ({ id: c.id, nome: c.nome, codigo: c.codigo, precoVenda: Number(c.preco_venda) })),
    );
}
