/**
 * Insumos da tela de Tanques lidos do Supabase — o caminho de sempre, sem `VITE_API_TANQUES`.
 *
 * @remarks Movido de `useDashboardEstoque` (26/09/2026) sem mudar consulta nem filtro: tanques
 *          ativos com o combustível (`tanqueService.getAll`), réguas medidas dos tanques, TODAS as
 *          compras e leituras do posto (sem filtro de data — o corte é a régua de cada tanque,
 *          resolvido em `estoqueAtualDerivado`), despesas do mês e o histórico de 30 dias de cada
 *          tanque. Só a falha da lista de tanques vira `Err` (antes: a tela parava de carregar);
 *          as outras consultas, como antes, caem em vazio.
 */
import { ResultAsync } from 'neverthrow';
import { tanqueService } from '../../../../services/api';
import type { Tanque as TanqueDoServico } from '../../../../services/api/tanque.service';
import { supabase } from '../../../../services/supabase';
import type { MovimentoLitros, ReguaTanque } from '../model/estoque-derivado';
import type { TankHistory, TanqueDoCadastro } from '../types';
import { entradaDoHistorico, periodosDaTela, type InsumosDoPainel } from './insumos';

interface ReguaRow { tanque_id: number; data: string; volume_fisico: number | string | null }
interface CompraRow { combustivel_id: number | null; data: string; quantidade_litros: number | string }
interface LeituraRow { data: string; litros_vendidos: number | string | null; bico: { combustivel_id: number } | null }

function doCadastro(t: TanqueDoServico): TanqueDoCadastro {
    return {
        id: t.id,
        nome: t.nome,
        combustivel_id: t.combustivel_id,
        capacidade: t.capacidade,
        ...(t.combustivel === undefined ? {} : { combustivel: t.combustivel }),
    };
}

function lerMovimento(postoId: number, tanqueIds: readonly number[], mesCorrente: string, fimDoMes: string) {
    return Promise.all([
        supabase
            .from('HistoricoTanque')
            .select('tanque_id, data, volume_fisico')
            .in('tanque_id', [...tanqueIds])
            .not('volume_fisico', 'is', null),
        supabase
            .from('Compra')
            .select('combustivel_id, data, quantidade_litros')
            .eq('posto_id', postoId),
        supabase
            .from('Leitura')
            .select('data, litros_vendidos, bico:Bico!inner(combustivel_id)')
            .eq('posto_id', postoId),
        supabase
            .from('Despesa')
            .select('valor')
            .eq('posto_id', postoId)
            .gte('data', `${mesCorrente}-01`)
            .lte('data', fimDoMes),
    ]);
}

async function lerHistoricos(tanques: readonly TanqueDoCadastro[]): Promise<TankHistory> {
    const historicos: TankHistory = {};
    await Promise.all(tanques.map(async (t) => {
        try {
            const resposta = await tanqueService.getHistory(t.id, 30);
            const linhas = resposta.success ? resposta.data : [];
            historicos[t.id] = linhas.map((h) => entradaDoHistorico(h.id, h.data, h.volume_livro, h.volume_fisico));
        } catch (e) {
            console.error(`Erro ao buscar histórico tanque ${t.id}`, e);
            historicos[t.id] = [];
        }
    }));
    return historicos;
}

async function lerDoSupabase(postoId: number, agora: Date): Promise<InsumosDoPainel> {
    const resposta = await tanqueService.getAll(postoId);
    if (!resposta.success) throw new Error(resposta.error);
    const tanques = resposta.data.map(doCadastro);
    const { mesCorrente, fimDoMes } = periodosDaTela(agora);
    const [reguasRes, comprasRes, leiturasRes, despesasRes] = await lerMovimento(postoId, tanques.map((t) => t.id), mesCorrente, fimDoMes);

    const reguas: ReguaTanque[] = ((reguasRes.data ?? []) as ReguaRow[]).map((r) => ({
        tanqueId: r.tanque_id,
        data: r.data.slice(0, 10),
        litros: Number(r.volume_fisico),
    }));
    const compras: MovimentoLitros[] = ((comprasRes.data ?? []) as CompraRow[])
        .filter((c) => c.combustivel_id !== null)
        .map((c) => ({ combustivelId: c.combustivel_id as number, data: c.data, litros: Number(c.quantidade_litros) }));
    const vendas: MovimentoLitros[] = ((leiturasRes.data ?? []) as unknown as LeituraRow[])
        .filter((l) => l.bico !== null)
        .map((l) => ({ combustivelId: (l.bico as { combustivel_id: number }).combustivel_id, data: l.data, litros: Number(l.litros_vendidos ?? 0) }));
    const despesasDoMes = (despesasRes.data ?? []).map((d) => Number((d as { valor: number | null }).valor ?? 0));

    return { tanques, reguas, compras, vendas, despesasDoMes, mesCorrente, historicos: await lerHistoricos(tanques) };
}

/** Os insumos da tela pelo Supabase, como `Result`. */
export function insumosDoSupabase(postoId: number, agora: Date): ResultAsync<InsumosDoPainel, string> {
    return ResultAsync.fromPromise(lerDoSupabase(postoId, agora), (erro) => (erro instanceof Error ? erro.message : String(erro)));
}
