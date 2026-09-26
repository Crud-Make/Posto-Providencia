/**
 * Insumos da tela de Tanques lidos da API Laravel (#103, `VITE_API_TANQUES`) — uma rota,
 * `GET /tanques/painel`, nenhuma chamada ao Supabase.
 *
 * Paridade com `fonte-supabase.ts`, campo a campo:
 *  - **Tanques.** Ativos, por nome; `capacidade` e preços de string decimal para `Number`, como o
 *    PostgREST entregava `numeric`. `preco_custo` nulo continua nulo.
 *  - **Réguas.** As mesmas linhas (medidas, dos tanques ativos), `data` já em `AAAA-MM-DD`.
 *  - **Compras e vendas.** O servidor corta o que vem ANTES da última régua mais antiga entre os
 *    tanques (e antes do 1º do mês): linha que nenhuma conta lê, porque cada tanque só soma o que é
 *    posterior à própria régua e a venda do mês começa no dia 1. A venda leva o combustível DO
 *    BICO. `data` chega como o dia UTC — o mesmo prefixo que a tela compara no timestamp do Supabase.
 *  - **Despesas.** As do mês, por competência; a tela soma.
 *  - **Histórico.** Linhas de `data >= hoje − 30` (local), agrupadas por tanque, em ordem de data.
 */
import { ResultAsync } from 'neverthrow';
import { descreverErroDaApi } from '../../../../services/api/base';
import { lerPainelDeTanquesDaApi, type PainelDeTanquesDaApi } from '../../../../services/api/tanques.api';
import type { TankHistory, TanqueDoCadastro } from '../types';
import { entradaDoHistorico, periodosDaTela, type InsumosDoPainel } from './insumos';

const numeroOuNulo = (decimal: string | null): number | null => (decimal === null ? null : Number(decimal));

function paraTanques(lido: PainelDeTanquesDaApi): TanqueDoCadastro[] {
    return lido.tanques.map((t) => ({
        id: t.id,
        nome: t.nome,
        combustivel_id: t.combustivel_id,
        capacidade: Number(t.capacidade),
        combustivel: {
            nome: t.combustivel.nome,
            codigo: t.combustivel.codigo,
            preco_venda: Number(t.combustivel.preco_venda),
            preco_custo: numeroOuNulo(t.combustivel.preco_custo),
        },
    }));
}

function paraHistoricos(lido: PainelDeTanquesDaApi): TankHistory {
    const historicos: TankHistory = {};
    for (const t of lido.tanques) {
        historicos[t.id] = lido.historico
            .filter((h) => h.tanque_id === t.id)
            .map((h) => entradaDoHistorico(h.id, h.data, numeroOuNulo(h.volume_livro), numeroOuNulo(h.volume_fisico)));
    }
    return historicos;
}

/** A resposta da API na forma que `montar-painel.ts` lê. */
export function paraInsumos(lido: PainelDeTanquesDaApi, mesCorrente: string): InsumosDoPainel {
    return {
        tanques: paraTanques(lido),
        reguas: lido.reguas.map((r) => ({ tanqueId: r.tanque_id, data: r.data, litros: Number(r.volume_fisico) })),
        compras: lido.compras.map((c) => ({ combustivelId: c.combustivel_id, data: c.data, litros: Number(c.quantidade_litros) })),
        vendas: lido.vendas.map((v) => ({ combustivelId: v.combustivel_id, data: v.data, litros: Number(v.litros_vendidos) })),
        despesasDoMes: lido.despesas.map((d) => Number(d.valor)),
        mesCorrente,
        historicos: paraHistoricos(lido),
    };
}

/** Os insumos da tela pela API, como `Result`. Falha vira a mensagem que a tela registra. */
export function insumosDaApi(postoId: number, agora: Date): ResultAsync<InsumosDoPainel, string> {
    const { mesCorrente, historicoDesde } = periodosDaTela(agora);
    return lerPainelDeTanquesDaApi(postoId, mesCorrente, historicoDesde)
        .map((lido) => paraInsumos(lido, mesCorrente))
        .mapErr(descreverErroDaApi);
}
