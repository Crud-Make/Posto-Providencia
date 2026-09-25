import { supabase } from '../supabase';
import { leituraService } from './leitura.service';
import { isSuccess } from '../../types/ui/response-types';
import {
    CONSOLIDADO_VAZIO,
    consolidarEncerrantesDoMes,
    type EncerranteMensalConsolidado,
    type EncerranteMensalLinha,
} from './encerrantes-do-mes';

export type { EncerranteMensalConsolidado, EncerranteMensalLinha };

export interface FechamentoMensalResumo {
    dia: string;
    volume_total: number;
    faturamento_bruto: number;
    /**
     * Os três de lucro vêm da RPC `get_fechamento_mensal` (Supabase) e são `null` pela API: a rota
     * `/fechamento-mensal` não os devolve (agregacao.md §0 e DECISÕES 3/4 — a RPC custeia pelo
     * `preco_custo` de hoje, chumba a taxa por nome e não desconta despesa). O que pôr no lugar
     * espera decisão do dono; a tela mostra "—", nunca 0.
     */
    lucro_bruto: number | null;
    custo_taxas: number | null;
    lucro_liquido: number | null;
    status: string;
    vol_gasolina: number;
    vol_aditivada: number;
    vol_etanol: number;
    vol_diesel: number;
}

export const fechamentoMensalService = {
    async getResumoMensal(postoId: number, mes: number, ano: number): Promise<FechamentoMensalResumo[]> {
        const { data, error } = await supabase.rpc('get_fechamento_mensal', {
            p_posto_id: postoId,
            p_mes: mes,
            p_ano: ano
        });

        if (error) {
            console.error('Erro ao buscar fechamento mensal:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Consolida o encerrante do mês — o bloco `Caixa Dia 01 a 31` da planilha.
     *
     * @remarks
     * Busca as leituras cruas do mês e delega a conta pra `encerranteMensal`
     * (`@posto/utils`), que é a fonte única da fórmula e está coberta pelo golden
     * master dos 7 meses reais de 2026. Este service só **adapta** — não calcula.
     *
     * Substitui a RPC `get_encerrantes_mensal`, que fazia `MIN(leitura_inicial)` /
     * `MAX(leitura_final)` do mês inteiro. Min/max parece igual enquanto o
     * encerrante só sobe, mas adota um encerrante digitado errado pra sempre e
     * nunca desanda — o erro fica invisível. Ancorar no primeiro e no último dia
     * deixa o número errado grudado num dia específico, onde dá pra achar.
     */
    async getEncerrantesMensal(postoId: number, mes: number, ano: number): Promise<EncerranteMensalConsolidado> {
        const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

        const res = await leituraService.getByDateRange(inicio, fim, postoId);
        if (!isSuccess(res)) {
            console.error('Erro ao buscar leituras do mês:', res.error);
            return CONSOLIDADO_VAZIO;
        }
        if (!res.data) return CONSOLIDADO_VAZIO;

        return consolidarEncerrantesDoMes(res.data);
    }
};
