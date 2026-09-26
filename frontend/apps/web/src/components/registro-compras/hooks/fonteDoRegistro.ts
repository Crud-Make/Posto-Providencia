/**
 * De onde o Registro de Compras lê o mês: Supabase (o caminho de hoje) ou API Laravel (#103), pela
 * flag da tela ({@link registroDeComprasPelaApi}). As duas fontes entregam a MESMA
 * {@link EntradaDoRegistro}; a conta é uma só ({@link montarRegistroDoMes}).
 *
 * Paridade da fonte da API com as queries do Supabase, campo a campo:
 * - combustíveis: só os ativos, na ordem `ORDEM_COMBUSTIVEIS` (a do `combustivelService.getAll`);
 * - tanques: só os ativos (`.eq('ativo', true)`: `null` fica de fora), na ordem do nome;
 * - leituras e compras do período: `GET /movimento`, que já recorta o dia em UTC como o PostgREST;
 *   o bico vem com o `combustivel_id` DO BICO, e o número sai do catálogo de bicos;
 * - régua anterior: das medições de `GET /movimento` (sem limite inferior), as ANTES do início e
 *   com `volume_fisico` medido, da mais nova para a mais velha.
 */
import { ResultAsync } from 'neverthrow';
import { supabase } from '../../../services/supabase';
import { combustivelService, tanqueService } from '../../../services/api';
import { descreverErroDaApi } from '../../../services/api/base';
import { lerRegistroDoPeriodoDaApi, registroDeComprasPelaApi, type DadosDoRegistroDaApi } from '../../../services/api/compras.api';
import { isSuccess, type ApiResponse } from '../../../types/ui/response-types';
import type { Periodo } from '../../../utils/periodo';
import type { CombustivelDoRegistro, CompraRow, EntradaDoRegistro, LeituraRow, ReguaRow } from './tipos-do-registro';

const ORDEM: readonly string[] = combustivelService.ORDEM_COMBUSTIVEIS;
const posicao = (codigo: string): number => (ORDEM.includes(codigo) ? ORDEM.indexOf(codigo) : 999);

/** Os dados crus da API na entrada comum. Exportada para o teste de paridade. */
export function entradaDaApi(dados: DadosDoRegistroDaApi, inicio: string): EntradaDoRegistro {
    const numeroDoBico = new Map(dados.bicos.map((b) => [b.id, b.numero]));

    const combustiveis: CombustivelDoRegistro[] = dados.combustiveis
        .filter((c) => c.ativo)
        .map((c) => ({ id: c.id, nome: c.nome, codigo: c.codigo, preco_venda: Number(c.preco_venda) }))
        .sort((a, b) => posicao(a.codigo) - posicao(b.codigo));

    const leituras: LeituraRow[] = dados.movimento.leituras.map((l) => {
        const numero = numeroDoBico.get(l.bico_id);
        return {
            data: l.data,
            bico_id: l.bico_id,
            leitura_inicial: l.leitura_inicial,
            leitura_final: l.leitura_final,
            valor_total: l.valor_total,
            bico: numero === undefined ? null : { id: l.bico_id, numero, combustivel_id: l.combustivel_id },
        };
    });

    const reguas: ReguaRow[] = dados.movimento.medicoes
        .filter((m) => m.data < inicio && m.volume_fisico !== null)
        .map((m) => ({ tanque_id: m.tanque_id, data: m.data, volume_fisico: m.volume_fisico }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

    return {
        combustiveis,
        tanques: dados.tanques.filter((t) => t.ativo === true).map((t) => ({ id: t.id, combustivel_id: t.combustivel_id })),
        leituras,
        compras: dados.movimento.compras.map((c): CompraRow => ({
            combustivel_id: c.combustivel_id,
            quantidade_litros: c.quantidade_litros,
            valor_total: c.valor_total,
        })),
        reguas,
    };
}

function extrair<T>(resposta: ApiResponse<T>): T {
    if (isSuccess(resposta)) return resposta.data;
    throw new Error(resposta.error || 'Erro ao buscar dados do serviço');
}

/** O caminho de hoje, intacto: services do Supabase e três queries diretas. */
async function entradaDoSupabase(postoId: number, periodo: Periodo): Promise<EntradaDoRegistro> {
    const [combustiveisRes, tanquesRes, leiturasRes, comprasRes, reguasRes] = await Promise.all([
        combustivelService.getAll(postoId),
        tanqueService.getAll(postoId),
        supabase
            .from('Leitura')
            .select('data, bico_id, leitura_inicial, leitura_final, valor_total, bico:Bico!inner(id, numero, combustivel_id)')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim),
        supabase
            .from('Compra')
            .select('combustivel_id, quantidade_litros, valor_total')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim),
        supabase
            .from('HistoricoTanque')
            .select('tanque_id, data, volume_fisico')
            .lt('data', periodo.inicio)
            .not('volume_fisico', 'is', null)
            .order('data', { ascending: false }),
    ]);

    const combustiveis = extrair(combustiveisRes);
    const tanques = extrair(tanquesRes);
    if (leiturasRes.error) throw new Error(`Falha ao ler as vendas do mês: ${leiturasRes.error.message}`);
    if (comprasRes.error) throw new Error(`Falha ao ler as compras do mês: ${comprasRes.error.message}`);
    if (reguasRes.error) throw new Error(`Falha ao ler a régua anterior: ${reguasRes.error.message}`);

    return {
        combustiveis: combustiveis.map((c) => ({ id: c.id, nome: c.nome, codigo: c.codigo, preco_venda: c.preco_venda })),
        tanques,
        leituras: (leiturasRes.data ?? []) as unknown as LeituraRow[],
        compras: (comprasRes.data ?? []) as CompraRow[],
        reguas: (reguasRes.data ?? []) as ReguaRow[],
    };
}

/** A entrada do mês pela fonte que a flag escolhe. O erro é a mensagem para o console. */
export function carregarEntradaDoRegistro(postoId: number, periodo: Periodo): ResultAsync<EntradaDoRegistro, string> {
    if (registroDeComprasPelaApi()) {
        return lerRegistroDoPeriodoDaApi(postoId, periodo.inicio, periodo.fim)
            .map((dados) => entradaDaApi(dados, periodo.inicio))
            .mapErr(descreverErroDaApi);
    }
    return ResultAsync.fromPromise(entradaDoSupabase(postoId, periodo), (erro) => (erro instanceof Error ? erro.message : String(erro)));
}
