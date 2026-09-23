/**
 * Custo do mês por produto e despesa operacional rateada por litro.
 *
 * @remarks
 * Alimenta o lucro por bico da aba Gestão de Bicos com os mesmos números que
 * o Resumo Mensal já usa — `custoMedioCompra` e `despesaOperacionalPorLitro`
 * de `@posto/utils`, nunca o `preco_custo` do cadastro (um preço só, o de
 * hoje) e nunca margem fixa por tipo de combustível. Ver `useLucroPorBico`.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { calculaCustoMensal } from './custo-mensal';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';
import type { BicoComDetalhes } from '../../../types/fechamento';

interface RetornoCustoMensal {
  /** Custo médio de compra por litro, por nome de produto. `null` sem compra no mês. */
  custoMedioPorProduto: Record<string, number | null>;
  despesaOperacionalLitro: number;
  /** `false` quando o mês não tem nenhuma despesa lançada — ver `despesaOperacionalPorLitro` (`@posto/utils`). */
  temDespesa: boolean;
  carregando: boolean;
}

export const useCustoMensal = (
  postoId: number | null,
  dataSelecionada: string,
  bicos: readonly BicoComDetalhes[]
): RetornoCustoMensal => {
  const [custoMedioPorProduto, setCustoMedioPorProduto] = useState<Record<string, number | null>>({});
  const [despesaOperacionalLitro, setDespesaOperacionalLitro] = useState(0);
  const [temDespesa, setTemDespesa] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!postoId || !dataSelecionada || bicos.length === 0) return;

    setCarregando(true);
    try {
      const periodo = intervaloDoMes(dataSelecionada.slice(0, 7), hojeIso());

      const [leiturasRes, comprasRes, despesasRes] = await Promise.all([
        supabase
          .from('Leitura')
          .select('bico_id, leitura_inicial, leitura_final, valor_total')
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
          .from('Despesa')
          .select('valor')
          .eq('posto_id', postoId)
          .gte('data', periodo.inicio)
          .lte('data', periodo.fim),
      ]);

      // O cálculo mora em `calculaCustoMensal` (puro). O `.error` de cada consulta
      // segue ignorado — defeito conhecido, fixado no teste de caracterização.
      const custo = calculaCustoMensal(
        leiturasRes.data ?? [],
        comprasRes.data ?? [],
        despesasRes.data ?? [],
        bicos
      );

      setCustoMedioPorProduto(custo.custoMedioPorProduto);
      setDespesaOperacionalLitro(custo.despesaOperacionalLitro);
      setTemDespesa(custo.temDespesa);
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postoId, dataSelecionada?.slice(0, 7), bicos.length]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { custoMedioPorProduto, despesaOperacionalLitro, temDespesa, carregando };
};
