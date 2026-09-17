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
import {
  encerranteMensal,
  custoMedioCompra,
  despesaOperacionalPorLitro,
  type LeituraDiariaBico,
} from '@posto/utils';
import { supabase } from '../../../services/supabase';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';
import type { BicoComDetalhes } from '../../../types/fechamento';

interface RetornoCustoMensal {
  /** Custo médio de compra por litro, por nome de produto. `null` sem compra no mês. */
  custoMedioPorProduto: Record<string, number | null>;
  despesaOperacionalLitro: number;
  /** `false` quando o mês não tem nenhuma despesa lançada — ver {@link despesaOperacionalPorLitro}. */
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

      const nomeProdutoPorCombustivelId = new Map(bicos.map(b => [b.combustivel.id, b.combustivel.nome]));

      // Total de litros do mês — mesma agregação do Resumo Mensal (dia parcial de
      // fora), pra esse número nunca divergir do que a outra tela já mostra.
      const diarias: LeituraDiariaBico[] = (leiturasRes.data ?? []).map(l => ({
        dia: 1, // irrelevante aqui: só o total do mês importa, não a série por dia.
        bico: String(l.bico_id),
        inicial: l.leitura_inicial === null ? null : Number(l.leitura_inicial),
        fechamento: l.leitura_final === null ? null : Number(l.leitura_final),
        valorDia: l.valor_total === null ? null : Number(l.valor_total),
      }));
      const litrosDoMes = encerranteMensal(diarias).litros;

      const comprasPorProduto = new Map<string, { litros: number; valorTotal: number }[]>();
      for (const c of comprasRes.data ?? []) {
        const produto = c.combustivel_id !== null ? nomeProdutoPorCombustivelId.get(c.combustivel_id) : undefined;
        if (!produto) continue;
        const lista = comprasPorProduto.get(produto) ?? [];
        lista.push({ litros: Number(c.quantidade_litros), valorTotal: Number(c.valor_total) });
        comprasPorProduto.set(produto, lista);
      }

      const custoPorProduto: Record<string, number | null> = {};
      for (const produto of new Set(nomeProdutoPorCombustivelId.values())) {
        custoPorProduto[produto] = custoMedioCompra(comprasPorProduto.get(produto) ?? []);
      }

      const valoresDespesa = (despesasRes.data ?? []).map(d => Number(d.valor));
      const despesaDoMes = valoresDespesa.reduce((acc, v) => acc + v, 0);

      setCustoMedioPorProduto(custoPorProduto);
      setDespesaOperacionalLitro(despesaOperacionalPorLitro(despesaDoMes, litrosDoMes));
      setTemDespesa(valoresDespesa.length > 0);
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
