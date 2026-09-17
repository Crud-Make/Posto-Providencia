import { supabase } from '../supabase';
import { leituraService } from './leitura.service';
import { isSuccess } from '../../types/ui/response-types';
import {
    encerranteMensal,
    type EncerranteMensal,
    type EncerranteMensalBico,
    type LeituraDiariaBico,
} from '@posto/utils';

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

/** Linha da tabela de encerrantes da tela: o acumulado do bico + os nomes pra exibir. */
export interface EncerranteMensalLinha extends EncerranteMensalBico {
    bicoNome: string;
    combustivelNome: string;
    /** `Combustivel.codigo` (GC/GA/ET/S10) — chave da cor da planilha. */
    combustivelCodigo: string | null;
}

/** Consolidado do mês pronto pra tela. */
export interface EncerranteMensalConsolidado extends Omit<EncerranteMensal, 'bicos'> {
    bicos: EncerranteMensalLinha[];
}

const CONSOLIDADO_VAZIO: EncerranteMensalConsolidado = {
    bicos: [],
    ultimoDiaFechado: null,
    litros: 0,
    litrosLancados: 0,
    litrosEmLacuna: 0,
    bruto: 0,
    precoMedio: null,
    temLacuna: false,
};

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

        const nomes = new Map<string, { bicoNome: string; combustivelNome: string; combustivelCodigo: string | null }>();

        // Um bico pode ter mais de uma leitura no mesmo dia (um turno cada). O dia
        // abre no encerrante inicial do primeiro turno e fecha no final do último —
        // por ordem de turno, não por min/max, pra não mascarar leitura errada.
        const porDiaBico = new Map<string, LeituraDiariaBico>();

        const ordenadas = [...res.data].sort(
            (a, b) =>
                a.data.localeCompare(b.data) ||
                (a.turno_id ?? 0) - (b.turno_id ?? 0) ||
                a.id - b.id
        );

        for (const l of ordenadas) {
            const dia = Number(l.data.slice(8, 10));
            // Chave = número do bico com zero à esquerda, pra ordenar 02 antes de 10.
            const bico = String(l.bico?.numero ?? l.bico_id).padStart(2, '0');
            const chave = `${dia}|${bico}`;

            if (!nomes.has(bico)) {
                nomes.set(bico, {
                    bicoNome: `Bico ${bico}`,
                    combustivelNome: l.bico?.combustivel?.nome ?? '—',
                    combustivelCodigo: l.bico?.combustivel?.codigo ?? null,
                });
            }

            const atual = porDiaBico.get(chave);
            if (!atual) {
                porDiaBico.set(chave, {
                    dia,
                    bico,
                    inicial: l.leitura_inicial,
                    fechamento: l.leitura_final,
                    valorDia: l.valor_total,
                });
                continue;
            }

            atual.fechamento = l.leitura_final;
            atual.valorDia = (atual.valorDia ?? 0) + (l.valor_total ?? 0);
        }

        const consolidado = encerranteMensal([...porDiaBico.values()]);

        return {
            ...consolidado,
            bicos: consolidado.bicos.map((b) => ({
                ...b,
                bicoNome: nomes.get(b.bico)?.bicoNome ?? b.bico,
                combustivelNome: nomes.get(b.bico)?.combustivelNome ?? '—',
                combustivelCodigo: nomes.get(b.bico)?.combustivelCodigo ?? null,
            })),
        };
    }
};
