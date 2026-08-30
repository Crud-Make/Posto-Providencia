/**
 * Busca do banco o que a fórmula de impacto de troca de preço consome (Issue #61).
 *
 * Todo o cálculo é de `@posto/utils/troca-preco`; aqui só se busca, traduz
 * (snake_case → camelCase, uma vez, nesta fronteira) e recorta o mês.
 *
 * @remarks A busca começa no MÊS ANTERIOR: a régua que ancora o estoque da
 *          troca costuma ser a medição de fim do mês anterior (é a abertura da
 *          planilha), e as vendas/compras desde ela precisam estar na corrente.
 *          As trocas detectadas fora do mês selecionado são descartadas depois.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  impactoTrocaDePreco,
  resumoPorDirecao,
  seriePrecoDiario,
  totalGanhoVendasCentavos,
  type ImpactoTroca,
  type ResumoPorDirecao,
  type LeituraPrecoDia,
  type CompraComData,
  type ReguaComData,
} from '@posto/utils';
import { supabase } from '@/services/supabase';
import { intervaloDoMes, hojeIso } from '@/utils/periodo';

interface LeituraDoBanco {
  readonly data: string;
  readonly litros_vendidos: number | null;
  readonly preco_litro: number | null;
  readonly bico: { readonly combustivel_id: number } | null;
}

interface CompraDoBanco {
  readonly combustivel_id: number;
  readonly data: string;
  readonly quantidade_litros: number;
  readonly valor_total: number;
}

interface ReguaDoBanco {
  readonly tanque_id: number;
  readonly data: string;
  /** Nulo = medição não feita naquele dia — régua que NÃO existe, nunca 0 L. */
  readonly volume_fisico: number | null;
}

interface TanqueDoBanco {
  readonly id: number;
  readonly combustivel_id: number;
}

interface CombustivelDoBanco {
  readonly id: number;
  readonly nome: string;
  /** Sigla da planilha (GC/GA/ET/S10) — chave de `corDoProduto`. */
  readonly codigo: string | null;
}

/** Uma troca do mês, pronta para exibição. */
export interface ImpactoExibivel extends ImpactoTroca {
  readonly nomeCombustivel: string;
  /** Sigla da planilha (GC/GA/ET/S10), para a cor que o dono reconhece. */
  readonly codigoCombustivel: string | null;
}

/** A variação de preço de um combustível no mês (gráfico de barras). */
export interface BarraVariacao {
  readonly combustivel: string;
  readonly nomeCombustivel: string;
  readonly codigoCombustivel: string | null;
  /** Primeiro preço do mês com registro (R$/L). */
  readonly precoInicio: number;
  /** Último preço do mês com registro (R$/L). */
  readonly precoFim: number;
  /** `precoFim − precoInicio` (R$/L). Zero = não mexeu no mês. */
  readonly variacao: number;
}

export interface DadosImpactoTrocaPreco {
  readonly impactos: readonly ImpactoExibivel[];
  /** O mês decomposto em subidas × descidas (Issue #70). O líquido do mês é `resumo.liquidoCentavos`. */
  readonly resumo: ResumoPorDirecao;
  /** Quanto cada combustível variou no mês — barras do "foi só o diesel?". */
  readonly barras: readonly BarraVariacao[];
  /** Lucro extra já realizado nas VENDAS desde as trocas do mês, em centavos. */
  readonly totalVendasCentavos: number;
}

/** `2026-03` → `2026-02-01` (início da busca, um mês antes). */
function inicioDoMesAnterior(mesIso: string): string {
  const [ano, mes] = mesIso.split('-').map(Number);
  return mes === 1 ? `${ano - 1}-12-01` : `${ano}-${String(mes - 1).padStart(2, '0')}-01`;
}

export function useImpactoTrocaPreco(postoId: number | null, mesIso: string) {
  const [dados, setDados] = useState<DadosImpactoTrocaPreco | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (postoId === null) { setDados(null); setCarregando(false); return; }
    setCarregando(true);
    setErro(null);
    try {
      const periodo = intervaloDoMes(mesIso, hojeIso());
      const inicioBusca = inicioDoMesAnterior(mesIso);

      const [leiturasRes, comprasRes, reguasRes, tanquesRes, combustiveisRes] = await Promise.all([
        supabase
          .from('Leitura')
          .select('data, litros_vendidos, preco_litro, bico:Bico!inner(combustivel_id)')
          .eq('posto_id', postoId)
          .gte('data', inicioBusca)
          .lte('data', periodo.fim),
        supabase
          .from('Compra')
          .select('combustivel_id, data, quantidade_litros, valor_total')
          .eq('posto_id', postoId)
          .gte('data', inicioBusca)
          .lte('data', periodo.fim),
        supabase
          .from('HistoricoTanque')
          .select('tanque_id, data, volume_fisico')
          .not('volume_fisico', 'is', null)
          .gte('data', inicioBusca)
          .lte('data', periodo.fim),
        supabase.from('Tanque').select('id, combustivel_id').eq('posto_id', postoId),
        supabase.from('Combustivel').select('id, nome, codigo').eq('posto_id', postoId),
      ]);

      const primeiraFalha = [leiturasRes, comprasRes, reguasRes, tanquesRes, combustiveisRes]
        .find((r) => r.error != null);
      if (primeiraFalha?.error) throw new Error(primeiraFalha.error.message);

      const combustivelDoTanque = new Map<number, number>(
        ((tanquesRes.data ?? []) as TanqueDoBanco[]).map((t) => [t.id, t.combustivel_id]),
      );
      const cadastroCombustiveis = (combustiveisRes.data ?? []) as CombustivelDoBanco[];
      const nomeDoCombustivel = new Map<number, string>(cadastroCombustiveis.map((c) => [c.id, c.nome]));
      const codigoDoCombustivel = new Map<number, string | null>(
        cadastroCombustiveis.map((c) => [c.id, c.codigo]),
      );

      // A fronteira do mapper: daqui para baixo é camelCase e domínio puro.
      const leituras: LeituraPrecoDia[] = ((leiturasRes.data ?? []) as unknown as LeituraDoBanco[])
        .filter((l) => l.bico != null)
        .map((l) => ({
          data: l.data.slice(0, 10),
          combustivel: String(l.bico?.combustivel_id),
          precoLitro: l.preco_litro,
          litrosVendidos: l.litros_vendidos ?? 0,
        }));

      const compras: CompraComData[] = ((comprasRes.data ?? []) as CompraDoBanco[]).map((c) => ({
        combustivel: String(c.combustivel_id),
        data: c.data.slice(0, 10),
        litros: c.quantidade_litros,
        valorTotal: c.valor_total,
      }));

      // O filtro de nulo repete o da query de propósito: régua sem medição que
      // escapasse viraria "tanque com 0 L" lá na corrente (null × n = 0 em JS).
      const reguas: ReguaComData[] = ((reguasRes.data ?? []) as ReguaDoBanco[])
        .filter((r) => combustivelDoTanque.has(r.tanque_id) && r.volume_fisico != null)
        .map((r) => ({
          combustivel: String(combustivelDoTanque.get(r.tanque_id)),
          data: r.data.slice(0, 10),
          litros: r.volume_fisico ?? 0,
        }));

      const doMes = impactoTrocaDePreco(leituras, compras, reguas)
        .filter((i) => i.data.slice(0, 7) === mesIso)
        .map((i) => ({
          ...i,
          nomeCombustivel: nomeDoCombustivel.get(Number(i.combustivel)) ?? `Combustível ${i.combustivel}`,
          codigoCombustivel: codigoDoCombustivel.get(Number(i.combustivel)) ?? null,
        }));

      // Barras: só o mês selecionado (a busca começa no mês anterior por causa da régua).
      const seriesDoMes = seriePrecoDiario(leituras.filter((l) => l.data.slice(0, 7) === mesIso));
      const barras: BarraVariacao[] = seriesDoMes
        .filter((serie) => serie.pontos.length > 0)
        .map((serie) => {
          const precoInicio = serie.pontos[0].preco;
          const precoFim = serie.pontos[serie.pontos.length - 1].preco;
          return {
            combustivel: serie.combustivel,
            nomeCombustivel: nomeDoCombustivel.get(Number(serie.combustivel)) ?? `Combustível ${serie.combustivel}`,
            codigoCombustivel: codigoDoCombustivel.get(Number(serie.combustivel)) ?? null,
            precoInicio,
            precoFim,
            variacao: precoFim - precoInicio,
          };
        });

      setDados({
        impactos: doMes,
        resumo: resumoPorDirecao(doMes),
        barras,
        totalVendasCentavos: totalGanhoVendasCentavos(doMes),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui apurar as trocas de preço.');
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, [postoId, mesIso]);

  useEffect(() => { void carregar(); }, [carregar]);

  return { dados, carregando, erro, recarregar: carregar };
}
