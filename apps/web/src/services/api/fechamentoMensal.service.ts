import { supabase } from '../supabase';

export interface FechamentoMensalResumo {
    dia: string;
    volume_total: number;
    faturamento_bruto: number;
    lucro_bruto: number;
    custo_taxas: number;
    lucro_liquido: number;
    status: string;
    vol_gasolina: number;
    vol_aditivada: number;
    vol_etanol: number;
    vol_diesel: number;
}

export interface EncerranteMensal {
    bico_nome: string;
    combustivel_nome: string;
    leitura_inicial: number;
    leitura_final: number;
    vendas_registradas: number;
    diferenca: number;
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

    async getEncerrantesMensal(postoId: number, mes: number, ano: number): Promise<EncerranteMensal[]> {
        const { data, error } = await supabase.rpc('get_encerrantes_mensal', {
            p_posto_id: postoId,
            p_mes: mes,
            p_ano: ano
        });

        if (error) {
            console.error('Erro ao buscar encerrantes mensais:', error);
            return [];
        }

        return data || [];
    }
};
