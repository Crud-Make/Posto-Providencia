import { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, type ErroDaApi } from './base';
import { lerCatalogoDeBicosDaApi, type BicoDaApi } from './bico.api';
import { lerNomesDeCombustivelDaApi } from './combustivel.api';
import { lerDespesasDoPeriodo, type DespesaDaApi } from './despesas.api';

/**
 * O movimento do período da aba Receitas e Despesas pela API (#103): `/movimento` (leituras,
 * compras, recebimentos), `/despesas`, `/receitas` e o catálogo (bicos e nomes de combustível).
 * Só leitura e tradução de formato — nenhuma conta; a conta é `montarDadosFinanceiros`.
 */

const decimal = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dia fora de AAAA-MM-DD');

/** O pedaço de `MovimentoDoPosto.php` que a aba usa. */
const movimento = z.object({
    leituras: z.array(z.object({ bico_id: z.number().int(), data: dia, litros_vendidos: decimal, valor_total: decimal })),
    compras: z.array(z.object({ combustivel_id: z.number().int(), data: dia, quantidade_litros: decimal, valor_total: decimal })),
    recebimentos: z.array(z.object({ id: z.number().int(), data: dia, valor: decimal, forma: z.string().nullable() })),
});

const receita = z.object({ id: z.number().int(), descricao: z.string(), categoria: z.string().nullable(), valor: decimal, data: dia });

export type MovimentoDaAba = z.infer<typeof movimento>;
export type ReceitaDaApi = z.infer<typeof receita>;

export interface PeriodoDaAbaPelaApi {
    readonly movimento: MovimentoDaAba;
    readonly despesas: readonly DespesaDaApi[];
    readonly receitas: readonly ReceitaDaApi[];
    readonly bicos: readonly BicoDaApi[];
    readonly nomesDeCombustivel: ReadonlyMap<number, string>;
}

/** Tudo o que a aba precisa do período, numa leva. */
export function lerPeriodoDaAbaPelaApi(postoId: number, inicio: string, fim: string): ResultAsync<PeriodoDaAbaPelaApi, ErroDaApi> {
    return ResultAsync.combine([
        buscarNaApi(`/api/postos/${postoId}/movimento?inicio=${inicio}&fim=${fim}`, movimento),
        lerDespesasDoPeriodo(postoId, inicio, fim),
        buscarNaApi(`/api/postos/${postoId}/receitas?inicio=${inicio}&fim=${fim}`, z.object({ data: z.array(receita) })),
        lerCatalogoDeBicosDaApi(postoId),
        lerNomesDeCombustivelDaApi(postoId),
    ] as const).map(([m, despesas, receitas, bicos, nomes]) => ({ movimento: m, despesas, receitas: receitas.data, bicos, nomesDeCombustivel: nomes }));
}
