/**
 * A tela de Tanques pela fonte ligada — a API Laravel com `VITE_API_TANQUES` (#103), o Supabase
 * sem — e as contas de `montar-painel.ts`, as mesmas nas duas.
 *
 * @remarks Falha da API nunca cai para o Supabase: com o login pela API não há sessão dele, e cair
 *          lá mostraria tanque vazio como se fosse verdade.
 */
import type { ResultAsync } from 'neverthrow';
import { tanquesPelaApi } from '../../../../services/api/tanques.api';
import { insumosDaApi } from './fonte-da-api';
import { insumosDoSupabase } from './fonte-supabase';
import { montarPainel, type PainelMontado } from './montar-painel';

export function carregarPainel(postoId: number, agora: Date = new Date()): ResultAsync<PainelMontado, string> {
    const insumos = tanquesPelaApi() ? insumosDaApi(postoId, agora) : insumosDoSupabase(postoId, agora);
    return insumos.map(montarPainel);
}
