/**
 * O que a tela de Tanques precisa ler, na MESMA forma nas duas fontes — `fonte-supabase.ts` (o
 * caminho de sempre) e `fonte-da-api.ts` (`VITE_API_TANQUES`, #103). As contas moram em
 * `montar-painel.ts` e não sabem de onde o dado veio.
 */
import { paraIsoLocal } from '@posto/utils';
import type { MovimentoLitros, ReguaTanque } from '../model/estoque-derivado';
import type { TankHistory, TankHistoryEntry, TanqueDoCadastro } from '../types';

export interface InsumosDoPainel {
    /** Tanques ativos do posto, por nome. */
    readonly tanques: readonly TanqueDoCadastro[];
    /** Réguas medidas (`volume_fisico` não nulo) dos tanques ativos. */
    readonly reguas: readonly ReguaTanque[];
    readonly compras: readonly MovimentoLitros[];
    readonly vendas: readonly MovimentoLitros[];
    /** Valor de cada despesa de competência no mês corrente, na ordem em que a fonte a entregou. */
    readonly despesasDoMes: readonly number[];
    /** Mês corrente LOCAL, `AAAA-MM` — o período do rateio. */
    readonly mesCorrente: string;
    /** Histórico de 30 dias por tanque, para o gráfico. */
    readonly historicos: TankHistory;
}

/** Os dois recortes da tela, do relógio LOCAL: o mês corrente e o início do histórico (hoje − 30). */
export function periodosDaTela(agora: Date): { readonly mesCorrente: string; readonly fimDoMes: string; readonly historicoDesde: string } {
    const mesCorrente = paraIsoLocal(agora).slice(0, 7);
    const [ano, mes] = mesCorrente.split('-').map(Number);
    const fimDoMes = `${mesCorrente}-${String(new Date(ano ?? 0, mes ?? 0, 0).getDate()).padStart(2, '0')}`;
    const inicio = new Date(agora);
    inicio.setDate(inicio.getDate() - 30);
    return { mesCorrente, fimDoMes, historicoDesde: paraIsoLocal(inicio) };
}

/** Uma linha do histórico: "não medido" fica AUSENTE, nunca 0 — 0 litros é uma medição real. */
export function entradaDoHistorico(id: number, data: string, livro: number | null, fisico: number | null): TankHistoryEntry {
    return {
        id,
        data,
        ...(livro === null ? {} : { volume_livro: livro }),
        ...(fisico === null ? {} : { volume_fisico: fisico }),
    };
}
