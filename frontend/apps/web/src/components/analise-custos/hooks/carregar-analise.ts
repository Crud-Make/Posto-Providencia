/**
 * A Análise de Custos de um mês, pela fonte ligada: a API Laravel com `VITE_API_CUSTOS` (#103,
 * `fonte-da-api.ts`), o Supabase sem (`fonte-supabase.ts`). As contas são as mesmas nas duas
 * (`montar-analise.ts`), e nenhuma mudou com a troca.
 *
 * @remarks Falha da API nunca cai para o Supabase: com o login pela API não há sessão dele, e cair
 *          lá mostraria um mês vazio como se fosse verdade.
 */
import type { ResultAsync } from 'neverthrow';
import { analiseCustosPelaApi, insumosDaApi } from './fonte-da-api';
import { insumosDoSupabase } from './fonte-supabase';
import { montarAnalise, type ResultadoDaAnalise } from './montar-analise';

export function carregarAnalise(ano: number, mes: number, postoId: number): ResultAsync<ResultadoDaAnalise, string> {
    const insumos = analiseCustosPelaApi() ? insumosDaApi(ano, mes, postoId) : insumosDoSupabase(ano, mes, postoId);
    return insumos.map(montarAnalise);
}
