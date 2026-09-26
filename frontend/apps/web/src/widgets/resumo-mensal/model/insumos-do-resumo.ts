import { ResultAsync } from 'neverthrow';
import { supabase } from '@/services/supabase';
import type { ErroDaApi } from '@/services/api/base';
import { lerCatalogoDoMesDaApi, lerMovimentoDaApi } from '@/services/api/proprietario.api';
import type { Periodo } from '@/utils/periodo';

/**
 * O que o resumo mensal lê do banco, nas duas fontes — Supabase e API Laravel (#100).
 *
 * @remarks As duas entregam as MESMAS linhas no MESMO formato, e o hook monta o resumo sem saber de
 *          onde vieram: o cálculo (`@posto/utils`) não muda com a troca de fonte. A API manda
 *          decimal em string; o `num()` do hook já aceitava `number | string`, como o PostgREST.
 */

export interface BicoDoBanco {
  id: number;
  numero: number;
  combustivel_id: number | null;
}

export interface CombustivelDoBanco {
  id: number;
  nome: string;
  codigo: string | null;
}

export interface LeituraDoBanco {
  data: string;
  bico_id: number;
  leitura_inicial: number | string | null;
  leitura_final: number | string | null;
  valor_total: number | string | null;
}

export interface CompraDoBanco {
  combustivel_id: number | null;
  quantidade_litros: number | string | null;
  valor_total: number | string | null;
}

export interface TanqueDoBanco {
  id: number;
  combustivel_id: number | null;
}

export interface MedicaoDoBanco {
  tanque_id: number;
  data: string;
  volume_fisico: number | string | null;
}

export interface FornecedorDoBanco {
  readonly id: number;
  readonly nome: string;
}

export interface InsumosDoResumo {
  readonly bicos: readonly BicoDoBanco[];
  readonly combustiveis: readonly CombustivelDoBanco[];
  readonly leituras: readonly LeituraDoBanco[];
  readonly compras: readonly CompraDoBanco[];
  readonly despesas: readonly { valor: number | string | null }[];
  readonly tanques: readonly TanqueDoBanco[];
  readonly fornecedores: readonly FornecedorDoBanco[];
  /** Régua dos tanques do posto com `data ≤ fim`, em ordem de data — a abertura vem daqui. */
  readonly medicoes: readonly MedicaoDoBanco[];
}

/** As consultas de sempre ao Supabase (o caminho sem `VITE_API_PROPRIETARIO`). */
export async function insumosDoSupabase(postoId: number, periodo: Periodo): Promise<InsumosDoResumo> {
  const [bicosRes, combustiveisRes, leiturasRes, comprasRes, despesasRes, tanquesRes, fornecedoresRes] = await Promise.all([
    supabase.from('Bico').select('id, numero, combustivel_id').eq('posto_id', postoId),
    supabase.from('Combustivel').select('id, nome, codigo').eq('posto_id', postoId),
    supabase
      .from('Leitura')
      .select('data, bico_id, leitura_inicial, leitura_final, valor_total')
      .eq('posto_id', postoId)
      .gte('data', periodo.inicio)
      .lte('data', periodo.fim),
    supabase
      .from('Compra')
      .select('combustivel_id, quantidade_litros, valor_total')
      .eq('posto_id', postoId)
      .gte('data', periodo.inicio)
      .lte('data', periodo.fim),
    supabase.from('Despesa').select('valor').eq('posto_id', postoId).gte('data', periodo.inicio).lte('data', periodo.fim),
    supabase.from('Tanque').select('id, combustivel_id').eq('posto_id', postoId),
    supabase.from('Fornecedor').select('id, nome').order('nome'),
  ]);

  const tanques = (tanquesRes.data ?? []) as TanqueDoBanco[];

  return {
    bicos: (bicosRes.data ?? []) as BicoDoBanco[],
    combustiveis: (combustiveisRes.data ?? []) as CombustivelDoBanco[],
    leituras: (leiturasRes.data ?? []) as LeituraDoBanco[],
    compras: (comprasRes.data ?? []) as CompraDoBanco[],
    despesas: (despesasRes.data ?? []) as { valor: number | string | null }[],
    tanques,
    fornecedores: (fornecedoresRes.data ?? []) as FornecedorDoBanco[],
    medicoes: await medicoesDoSupabase(tanques, periodo),
  };
}

/** Sem tanque não há régua a buscar — a consulta nem sai, como antes. */
async function medicoesDoSupabase(tanques: readonly TanqueDoBanco[], periodo: Periodo): Promise<MedicaoDoBanco[]> {
  if (tanques.length === 0) return [];
  const { data } = await supabase
    .from('HistoricoTanque')
    .select('tanque_id, data, volume_fisico')
    .in(
      'tanque_id',
      tanques.map((t) => t.id)
    )
    .lte('data', periodo.fim)
    .order('data', { ascending: true });
  return (data ?? []) as MedicaoDoBanco[];
}

/**
 * As mesmas linhas pela API: `GET /movimento` (leituras, compras, despesas, régua até o fim) e o
 * catálogo do posto. Nenhuma chamada ao Supabase.
 */
export function insumosDaApi(postoId: number, periodo: Periodo): ResultAsync<InsumosDoResumo, ErroDaApi> {
  return ResultAsync.combine([lerCatalogoDoMesDaApi(postoId), lerMovimentoDaApi(postoId, periodo.inicio, periodo.fim)] as const).map(
    ([catalogo, movimento]): InsumosDoResumo => ({
      bicos: catalogo.bicos,
      combustiveis: catalogo.combustiveis,
      leituras: movimento.leituras.map((l) => ({
        data: l.data,
        bico_id: l.bico_id,
        leitura_inicial: l.leitura_inicial,
        leitura_final: l.leitura_final,
        valor_total: l.valor_total,
      })),
      compras: movimento.compras.map((c) => ({
        combustivel_id: c.combustivel_id,
        quantidade_litros: c.quantidade_litros,
        valor_total: c.valor_total,
      })),
      despesas: movimento.despesas.map((d) => ({ valor: d.valor })),
      tanques: catalogo.tanques,
      fornecedores: catalogo.fornecedores,
      medicoes: movimento.medicoes,
    }),
  );
}
