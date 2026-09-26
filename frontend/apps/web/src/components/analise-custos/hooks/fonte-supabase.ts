/**
 * Insumos da Análise de Custos lidos do Supabase — o caminho de sempre, sem `VITE_API_CUSTOS`.
 *
 * @remarks Movido de `aggregatorService.fetchProfitabilityData` (25/09/2026) sem mudar consulta
 *          nem filtro: estoque do posto (a lista de produtos), leituras do mês com o combustível do
 *          bico, despesas do mês por competência e compras do mês. Falha de qualquer consulta vira
 *          `Err` com a mensagem que a tela sempre recebeu.
 */
import { ResultAsync } from 'neverthrow';
import { compraService, despesaService, estoqueService } from '../../../services/api';
import { supabase } from '../../../services/supabase';
import type { ApiResponse } from '../../../types/ui/response-types';
import { limitesDoMes, type InsumosDaAnalise, type ProdutoDaAnalise, type VendaDoMes } from './insumos';

function extrair<T>(resposta: ApiResponse<T>): T {
    if (resposta.success) return resposta.data;
    throw new Error(resposta.error !== '' ? resposta.error : 'Erro ao buscar dados do serviço');
}

/** O `x || 0` de antes, escrito por extenso: nulo, ausente e NaN valem 0. */
const ouZero = (valor: number | null | undefined): number =>
    typeof valor === 'number' && !Number.isNaN(valor) ? valor : 0;

/** O `x || 'N/A'` de antes: texto nulo, ausente ou vazio vira `'N/A'`. */
const ouNa = (texto: string | null | undefined): string =>
    typeof texto === 'string' && texto !== '' ? texto : 'N/A';

interface LeituraDoMes {
    readonly litros_vendidos: number | null;
    readonly valor_total: number | null;
    readonly bico?: { readonly combustivel_id: number } | null;
}

/** Σ litros e Σ valor por combustível do bico, na ordem das leituras (a mesma soma de antes). */
function vendasPorCombustivel(leituras: readonly LeituraDoMes[]): Map<number, VendaDoMes> {
    const vendas = new Map<number, VendaDoMes>();
    for (const l of leituras) {
        const id = l.bico?.combustivel_id;
        if (id === undefined) continue;
        const atual = vendas.get(id) ?? { litros: 0, receita: 0 };
        vendas.set(id, { litros: atual.litros + ouZero(l.litros_vendidos), receita: atual.receita + ouZero(l.valor_total) });
    }
    return vendas;
}

async function lerDoSupabase(ano: number, mes: number, postoId: number): Promise<InsumosDaAnalise> {
    const { inicio, fim } = limitesDoMes(ano, mes);
    const consultaLeituras = supabase
        .from('Leitura')
        .select('*, bico:Bico(combustivel_id)')
        .gte('data', inicio)
        .lte('data', fim)
        .eq('posto_id', postoId);

    const [estoqueRes, leiturasRes, despesasRes, comprasRes] = await Promise.all([
        estoqueService.getAll(postoId),
        consultaLeituras,
        despesaService.getByMonth(ano, mes, postoId),
        compraService.getByDateRange(inicio, fim, postoId),
    ]);
    if (leiturasRes.error) throw new Error(leiturasRes.error.message);

    const leituras = (leiturasRes.data ?? []) as LeituraDoMes[];
    const produtos: ProdutoDaAnalise[] = extrair(estoqueRes).map((e) => ({
        combustivelId: e.combustivel_id,
        nome: ouNa(e.combustivel?.nome),
        codigo: ouNa(e.combustivel?.codigo),
        precoVenda: ouZero(e.combustivel?.preco_venda),
    }));

    return {
        produtos,
        vendas: vendasPorCombustivel(leituras),
        totalDespesas: extrair(despesasRes).reduce((acc, d) => acc + Number(d.valor), 0),
        litrosDoMes: leituras.reduce((acc, l) => acc + ouZero(l.litros_vendidos), 0),
        compras: extrair(comprasRes),
    };
}

/** Os insumos do mês pelo Supabase, como `Result`. */
export function insumosDoSupabase(ano: number, mes: number, postoId: number): ResultAsync<InsumosDaAnalise, string> {
    return ResultAsync.fromPromise(lerDoSupabase(ano, mes, postoId), (erro) =>
        erro instanceof Error ? erro.message : 'Erro ao calcular rentabilidade'
    );
}
