import { ResultAsync } from 'neverthrow';
import { supabase } from '@/services/supabase';
import type { ErroDaApi } from '@/services/api/base';
import { lerCatalogoDoMesDaApi, lerMovimentoDaApi } from '@/services/api/proprietario.api';

/**
 * O que o impacto da troca de preço lê do banco, nas duas fontes — Supabase e API Laravel (#100).
 *
 * @remarks As duas entregam as MESMAS linhas no formato do PostgREST (número, não string), e o hook
 *          traduz e calcula sem saber a fonte. Na API o `Number()` é feito aqui, na borda, depois
 *          do Zod — é o mesmo valor que o PostgREST serializa de um `numeric`.
 */

export interface LeituraDoBanco {
  readonly data: string;
  readonly litros_vendidos: number | null;
  readonly preco_litro: number | null;
  readonly bico: { readonly combustivel_id: number } | null;
}

export interface CompraDoBanco {
  readonly combustivel_id: number;
  readonly data: string;
  readonly quantidade_litros: number;
  readonly valor_total: number;
}

export interface ReguaDoBanco {
  readonly tanque_id: number;
  readonly data: string;
  /** Nulo = medição não feita naquele dia — régua que NÃO existe, nunca 0 L. */
  readonly volume_fisico: number | null;
}

export interface TanqueDoBanco {
  readonly id: number;
  readonly combustivel_id: number;
}

export interface CombustivelDoBanco {
  readonly id: number;
  readonly nome: string;
  /** Sigla da planilha (GC/GA/ET/S10) — chave de `corDoProduto`. */
  readonly codigo: string | null;
}

export interface InsumosDaTroca {
  readonly leituras: readonly LeituraDoBanco[];
  readonly compras: readonly CompraDoBanco[];
  readonly reguas: readonly ReguaDoBanco[];
  readonly tanques: readonly TanqueDoBanco[];
  readonly combustiveis: readonly CombustivelDoBanco[];
}

/** As consultas de sempre ao Supabase (o caminho sem `VITE_API_PROPRIETARIO`). Falha vira `throw`, como antes. */
export async function insumosDoSupabase(postoId: number, inicioBusca: string, fim: string): Promise<InsumosDaTroca> {
  const [leiturasRes, comprasRes, reguasRes, tanquesRes, combustiveisRes] = await Promise.all([
    supabase
      .from('Leitura')
      .select('data, litros_vendidos, preco_litro, bico:Bico!inner(combustivel_id)')
      .eq('posto_id', postoId)
      .gte('data', inicioBusca)
      .lte('data', fim),
    supabase
      .from('Compra')
      .select('combustivel_id, data, quantidade_litros, valor_total')
      .eq('posto_id', postoId)
      .gte('data', inicioBusca)
      .lte('data', fim),
    supabase
      .from('HistoricoTanque')
      .select('tanque_id, data, volume_fisico')
      .not('volume_fisico', 'is', null)
      .gte('data', inicioBusca)
      .lte('data', fim),
    supabase.from('Tanque').select('id, combustivel_id').eq('posto_id', postoId),
    supabase.from('Combustivel').select('id, nome, codigo').eq('posto_id', postoId),
  ]);

  const primeiraFalha = [leiturasRes, comprasRes, reguasRes, tanquesRes, combustiveisRes]
    .find((r) => r.error != null);
  if (primeiraFalha?.error) throw new Error(primeiraFalha.error.message);

  return {
    leituras: (leiturasRes.data ?? []) as unknown as LeituraDoBanco[],
    compras: (comprasRes.data ?? []) as CompraDoBanco[],
    reguas: (reguasRes.data ?? []) as ReguaDoBanco[],
    tanques: (tanquesRes.data ?? []) as TanqueDoBanco[],
    combustiveis: (combustiveisRes.data ?? []) as CombustivelDoBanco[],
  };
}

/**
 * As mesmas linhas pela API: `GET /movimento` de `inicioBusca` a `fim` e o catálogo do posto.
 *
 * @remarks A régua da API vem com `data ≤ fim` e SEM limite inferior (a do Centro do Mês precisa da
 *          abertura); aqui se recorta em `inicioBusca` e se tira a régua não medida, que é o filtro
 *          que a consulta do Supabase fazia (`.not('volume_fisico', 'is', null)`, `.gte(inicioBusca)`).
 */
export function insumosDaApi(postoId: number, inicioBusca: string, fim: string): ResultAsync<InsumosDaTroca, ErroDaApi> {
  return ResultAsync.combine([lerCatalogoDoMesDaApi(postoId), lerMovimentoDaApi(postoId, inicioBusca, fim)] as const).map(
    ([catalogo, movimento]): InsumosDaTroca => ({
      leituras: movimento.leituras.map((l) => ({
        data: l.data,
        litros_vendidos: Number(l.litros_vendidos),
        preco_litro: Number(l.preco_litro),
        bico: { combustivel_id: l.combustivel_id },
      })),
      compras: movimento.compras.map((c) => ({
        combustivel_id: c.combustivel_id,
        data: c.data,
        quantidade_litros: Number(c.quantidade_litros),
        valor_total: Number(c.valor_total),
      })),
      reguas: movimento.medicoes.flatMap((m) =>
        m.volume_fisico === null || m.data < inicioBusca
          ? []
          : [{ tanque_id: m.tanque_id, data: m.data, volume_fisico: Number(m.volume_fisico) }],
      ),
      tanques: catalogo.tanques,
      combustiveis: catalogo.combustiveis,
    }),
  );
}
