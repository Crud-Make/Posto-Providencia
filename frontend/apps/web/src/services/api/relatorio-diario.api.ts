import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, type ErroDaApi } from './base';

/**
 * O Relatório Diário pela API Laravel (#103) — contrato de `GET /relatorio-diario`.
 *
 * @remarks
 * A rota entrega o que nenhuma outra entregava: TODAS as linhas de `Fechamento` do dia com o nome
 * de quem gravou, e as `Despesa` de competência no dia. Leituras e compras do mês a tela lê de
 * `GET /leituras` e `GET /dashboard`. Nada aqui é conta de dinheiro: decimal em string validado na
 * borda, `Number()` igual ao que o PostgREST fazia.
 */

/**
 * `true` quando o Relatório Diário lê da API. `VITE_API_RELATORIO` ausente segue `VITE_API_URL`;
 * `0` o deixa no Supabase (mesmo padrão de `VITE_API_DASHBOARD`/`VITE_API_PROPRIETARIO`).
 */
export function relatorioDiarioPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_RELATORIO);
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data fora de aaaa-mm-dd');
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/** Espelha `backend/app/Agregacao/Application/RelatorioDoDia.php`. */
export const relatorioDiarioDaApi = z.object({
    data: dataIso,
    fechamentos: z.array(
        z.object({
            id: z.number().int(),
            /** ISO 8601 UTC (`2026-09-20T00:00:00Z`). */
            data: z.string(),
            status: z.enum(['RASCUNHO', 'ABERTO', 'FECHADO']),
            /** `null` = ninguém apurou (I8). Nunca vira zero aqui. */
            total_vendas: decimalEmString.nullable(),
            diferenca: decimalEmString.nullable(),
            turno_id: z.number().int().nullable(),
            usuario_nome: z.string().nullable(),
        }),
    ),
    despesas: z.array(
        z.object({
            id: z.number().int(),
            descricao: z.string(),
            categoria: z.string().nullable(),
            valor: decimalEmString,
            data: dataIso,
            status: z.string().nullable(),
            data_pagamento: dataIso.nullable(),
            observacoes: z.string().nullable(),
        }),
    ),
});

export type RelatorioDiarioDaApi = z.infer<typeof relatorioDiarioDaApi>;

/** Fechamentos e despesas do dia (`AAAA-MM-DD`) do posto. Rota `posto.acesso:gerir`: quem não gere leva 403. */
export function lerRelatorioDiarioDaApi(postoId: number, dia: string): ResultAsync<RelatorioDiarioDaApi, ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return buscarNaApi(`/api/postos/${postoId}/relatorio-diario?${consulta}`, relatorioDiarioDaApi);
}
