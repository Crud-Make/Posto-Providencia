/**
 * Custo do mês por produto e despesa operacional rateada por litro.
 *
 * @remarks
 * Alimenta o lucro por bico da aba Gestão de Bicos com os mesmos números que
 * o Resumo Mensal já usa — `custoMedioCompra` e `despesaOperacionalPorLitro`
 * de `@posto/utils`, nunca o `preco_custo` do cadastro (um preço só, o de
 * hoje) e nunca margem fixa por tipo de combustível. Ver `useLucroPorBico`.
 *
 * #103 P9 passo 4a: com a API Laravel configurada (`urlDaApi()`), o custo vem do
 * `GET /api/postos/{posto}/dashboard` do MÊS CIVIL ({@link lerCustoDoMes}). Em erro — inclusive o
 * 403 de quem só tem `posto.acesso:ver` (decisão do dono, 22/09/2026, Q3) — o custo fica
 * INDISPONÍVEL: todo produto em `null` (lucro não apurável, a tela mostra "—"), nunca 0, e sem
 * cair para o Supabase. Sem API, o caminho Supabase segue como estava.
 */
import { useState, useEffect } from 'react';
import type { ResultAsync } from 'neverthrow';
import { supabase } from '../../../services/supabase';
import { urlDaApi, type ErroDaApi } from '../../../services/api/base';
import { lerDashboardDaApi } from '../../../services/api/dashboard.api';
import { calculaCustoMensal, custoMensalDaApi, type BicoDoCusto, type CustoMensal } from './custo-mensal';
import { intervaloDoMes, hojeIso, mesCivil, ehMesCorrente } from '../../../utils/periodo';
import type { BicoComDetalhes } from '../../../types/fechamento';

interface RetornoCustoMensal {
  /** Custo médio de compra por litro, por nome de produto. `null` sem compra no mês. */
  custoMedioPorProduto: Record<string, number | null>;
  despesaOperacionalLitro: number;
  /** `false` quando o mês não tem nenhuma despesa lançada — ver `despesaOperacionalPorLitro` (`@posto/utils`). */
  temDespesa: boolean;
  carregando: boolean;
  /**
   * Por que o custo não pôde ser lido da API (`null` quando leu, ou no caminho Supabase). Com erro,
   * todo produto vem `null` em `custoMedioPorProduto`: o lucro não é apurável.
   */
  erro: ErroDaApi | null;
  /**
   * `true` no mês corrente: compra e despesa são do mês civil INTEIRO (D1/D2, decisão do dono
   * 22/09/2026, Q4) e os litros ainda são parciais, então o rateio é provisório até o mês virar.
   */
  provisorio: boolean;
}

/**
 * Custo do mês pela API Laravel: o `/dashboard` do mês civil inteiro de `mes`, reduzido por
 * {@link custoMensalDaApi}. Nenhuma conta aqui.
 *
 * @param mes - Qualquer data `aaaa-mm-dd` (ou `aaaa-mm`) dentro do mês.
 */
export function lerCustoDoMes(
  postoId: number,
  mes: string,
  bicos: readonly BicoDoCusto[]
): ResultAsync<CustoMensal, ErroDaApi> {
  const janela = mesCivil(mes);
  return lerDashboardDaApi(postoId, janela.inicio, janela.fim).map(dash => custoMensalDaApi(dash, bicos));
}

/** Custo indisponível: todo produto dos bicos em `null` — nunca 0, que viraria lucro inventado. */
function custoIndisponivel(bicos: readonly BicoDoCusto[]): CustoMensal {
  const custoMedioPorProduto: Record<string, number | null> = {};
  for (const b of bicos) custoMedioPorProduto[b.combustivel.nome] = null;
  // O rateio não é usado por nenhum bico sem custo (`useCalculoGestaoBicos`: não apurado).
  return { custoMedioPorProduto, despesaOperacionalLitro: 0, temDespesa: false };
}

/**
 * Caminho Supabase, sem API configurada.
 *
 * #103 P9 passo 4b (D1/D2, decisão do dono 22/09/2026): Compra e Despesa vêm do MÊS CIVIL inteiro,
 * também no mês corrente — igual à API. A Leitura segue em `intervaloDoMes` (corte em hoje), com a
 * D5 e a soma da despesa em float: esses dois ficam para uma fatia própria, com golden.
 */
async function lerDoSupabase(
  postoId: number,
  dataSelecionada: string,
  bicos: readonly BicoComDetalhes[]
): Promise<CustoMensal> {
  const periodo = intervaloDoMes(dataSelecionada.slice(0, 7), hojeIso());
  const janelaDoCusto = mesCivil(dataSelecionada);

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
      .gte('data', janelaDoCusto.inicio)
      .lte('data', janelaDoCusto.fim),
    supabase
      .from('Despesa')
      .select('valor')
      .eq('posto_id', postoId)
      .gte('data', janelaDoCusto.inicio)
      .lte('data', janelaDoCusto.fim),
  ]);

  // O cálculo mora em `calculaCustoMensal` (puro). O `.error` de cada consulta
  // segue ignorado — defeito conhecido, fixado no teste de caracterização.
  return calculaCustoMensal(leiturasRes.data ?? [], comprasRes.data ?? [], despesasRes.data ?? [], bicos);
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
  const [erro, setErro] = useState<ErroDaApi | null>(null);

  const mes = dataSelecionada.slice(0, 7);

  useEffect(() => {
    if (postoId === null || postoId === 0 || mes === '' || bicos.length === 0) return;
    // Resposta atrasada de um mês/posto anterior não sobrescreve o atual.
    let ativo = true;

    const aplicar = (custo: CustoMensal, falha: ErroDaApi | null): void => {
      if (!ativo) return;
      setCustoMedioPorProduto(custo.custoMedioPorProduto);
      setDespesaOperacionalLitro(custo.despesaOperacionalLitro);
      setTemDespesa(custo.temDespesa);
      setErro(falha);
      setCarregando(false);
    };

    setCarregando(true);
    if (urlDaApi() !== null) {
      void lerCustoDoMes(postoId, mes, bicos).match(
        custo => aplicar(custo, null),
        falha => {
          console.error('[Fechamento] Custo do mês indisponível pela API:', falha);
          aplicar(custoIndisponivel(bicos), falha);
        }
      );
    } else {
      void lerDoSupabase(postoId, dataSelecionada, bicos).then(
        custo => aplicar(custo, null),
        (falha: unknown) => {
          // Antes do passo 4a a exceção escapava do `try/finally`; aqui só se desliga o carregando.
          console.error('[Fechamento] Falha ao ler o custo do mês no Supabase:', falha);
          if (ativo) setCarregando(false);
        }
      );
    }

    return () => {
      ativo = false;
    };
    // `bicos` entra pelo tamanho, como antes: a lista é recriada a cada render do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postoId, mes, bicos.length]);

  const provisorio = mes !== '' && ehMesCorrente(mes, hojeIso());

  return { custoMedioPorProduto, despesaOperacionalLitro, temDespesa, carregando, erro, provisorio };
};
