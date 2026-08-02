import { useState, useEffect, useCallback } from 'react';
import { despesaOperacionalPorLitro, margemPercentual } from '@posto/utils';
import { hojeIso, mesAtualIso, intervaloDoMes, ehMesCorrente, type Periodo } from '../../../utils/periodo';
import { supabase } from '../../../services/supabase';
import { postoService, frentistaService } from '../../../services/api';
import { DadosDashboard, PostoSummary, AlertaDashboard, ResumoFinanceiro } from '../types';
import { Posto } from '../../../types/database/index';
import { isSuccess } from '../../../types/ui/response-types';

interface UseDashboardReturn {
  dados: DadosDashboard | null;
  loading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/** Resumo zerado — usado quando não há venda no período. */
const RESUMO_VAZIO: ResumoFinanceiro = {
  vendas: 0,
  litros: 0,
  lucroBruto: 0,
  despesas: 0,
  rateioPorLitro: 0,
  lucroReal: 0,
  margemMedia: 0,
  temDespesa: false,
  frentistasAtivos: 0,
};

/**
 * Hook do painel do proprietário: apura o LUCRO REAL do posto.
 *
 * @param mesSelecionado - Mês a exibir, ISO local `aaaa-mm`. Padrão: mês corrente.
 *                         Em mês histórico o intervalo é o mês fechado e a aba "Hoje"
 *                         vem zerada — ver {@link DadosDashboard.ehMesCorrente}.
 *
 * @remarks
 * Fórmula (canônica, `@posto/utils/lucro`):
 *
 *     lucro_real = lucro_bruto − despesas_operacionais_do_período
 *
 * Equivale a ratear a despesa por litro e descontá-la bico a bico — a distributiva
 * dá no mesmo, e por isso o rateio aparece aqui só como número exibido (R$/L), não
 * como etapa de cálculo.
 *
 * ⚠️ NÃO usa o `lucro_liquido` da RPC `get_dashboard_proprietario`, embora ele exista.
 * A RPC desconta, além das despesas, uma taxa de cartão calculada por transação
 * (`DÉBITO × 1,2%`, `CRÉDITO × 3,5%`, chumbadas no SQL). Isso contradiz
 * `packages/utils/src/lucro.ts:11-12`: no modelo da planilha a taxa de cartão **não** é
 * dedução por transação, é mais um item da lista de despesas mensais. Descontar dos dois
 * jeitos conta a taxa duas vezes nos meses em que ela está lançada como despesa.
 * Em julho/2026 a diferença é de R$ 57,50 — pequena, mas é erro de modelo, não de escala.
 *
 * Validado contra o golden `lucro-real.golden.spec.ts`: julho até o dia 24 dá
 * R$ 18.272,33 aqui contra R$ 18.272,31 no golden — 2 centavos de arredondamento.
 */
export function useDashboardProprietario(mesSelecionado: string = mesAtualIso()): UseDashboardReturn {
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const response = await postoService.getAll();

      if (!isSuccess(response)) {
        setErro(response.error);
        setLoading(false);
        return;
      }

      const postos = response.data;
      if (postos.length === 0) {
        setErro('Nenhum posto encontrado.');
        setLoading(false);
        return;
      }

      // `hojeIso()`, NUNCA `new Date().toISOString()`: o posto está em GMT-3, então a
      // partir das 21h locais o UTC já virou o dia seguinte. Com `toISOString()` a tela
      // consultava 01/08 às 21h de 31/07 — e as DUAS abas zeravam, porque `inicioDoMes`
      // também saltava para o mês novo. Todo dia, das 21h à meia-noite, o painel apagava.
      const hoje = hojeIso();
      const periodo = intervaloDoMes(mesSelecionado, hoje);
      const mesCorrente = ehMesCorrente(mesSelecionado, hoje);

      const summaries = await Promise.all(
        postos.map((posto) => processarPosto(posto, periodo, hoje, mesCorrente))
      );

      setDados(consolidarDados(summaries, postos[0], mesSelecionado, mesCorrente));
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setErro('Falha ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, [mesSelecionado]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return { dados, loading, erro, recarregar: carregarDados };
}

// ============================================
// HELPERS (Lógica de Negócio)
// ============================================

/** Venda e lucro bruto do período, direto da RPC. */
export interface VendaPeriodo {
  vendas: number;
  litros: number;
  lucroBruto: number;
}

async function buscarVendas(postoId: number, inicio: string, fim: string): Promise<VendaPeriodo> {
  const { data } = await supabase.rpc('get_dashboard_proprietario', {
    p_posto_id: postoId,
    p_data_inicio: inicio,
    p_data_fim: fim,
  });

  const linha = data?.[0];
  return {
    vendas: Number(linha?.total_vendas ?? 0),
    litros: Number(linha?.volume_total ?? 0),
    lucroBruto: Number(linha?.lucro_bruto ?? 0),
  };
}

async function buscarDespesas(postoId: number, inicio: string, fim: string): Promise<number[]> {
  const { data } = await supabase
    .from('Despesa')
    .select('valor')
    .eq('posto_id', postoId)
    .gte('data', inicio)
    .lte('data', fim);

  return (data ?? []).map((d) => Number(d.valor ?? 0));
}

/**
 * Resumo do MÊS: as despesas lançadas no período entram inteiras.
 *
 * @remarks Exportada para teste. É o único lugar do painel onde a despesa do mês é
 *          descontada — foi o desconto acontecendo em dois lugares que produziu o erro
 *          de 97%.
 */
export function montarResumoDoMes(
  venda: VendaPeriodo,
  valoresDespesa: number[],
  frentistasAtivos: number
): ResumoFinanceiro {
  const despesas = valoresDespesa.reduce((acc, v) => acc + v, 0);
  const lucroReal = venda.lucroBruto - despesas;

  return {
    vendas: venda.vendas,
    litros: venda.litros,
    lucroBruto: venda.lucroBruto,
    despesas,
    rateioPorLitro: despesaOperacionalPorLitro(despesas, venda.litros),
    lucroReal,
    margemMedia: margemPercentual(lucroReal, venda.vendas),
    // Zero despesa lançada não é despesa zero — é dado faltando, e a tela precisa dizer isso.
    temDespesa: valoresDespesa.length > 0,
    frentistasAtivos,
  };
}

/**
 * Resumo do DIA: a despesa que cabe ao dia é o rateio do mês vezes os litros do dia.
 *
 * @param rateioDoMes - Despesa operacional por litro apurada no mês inteiro.
 *
 * @remarks Somar as despesas *lançadas no dia* estaria errado, e de um jeito que engana
 *          feio: despesa de posto é mensal (salário, energia, contador, imposto), lançada
 *          numa data qualquer do mês. No dia do lançamento a tela mostraria o mês inteiro
 *          de despesa contra a venda de um dia só — em 31/07/2026 isso dava R$ 18.585,76
 *          de despesa contra R$ 0,00 de venda, "prejuízo" que nunca existiu. Nos outros
 *          30 dias mostraria despesa zero e lucro inflado.
 *
 *          Ratear é o que a planilha faz e o que `@posto/utils/lucro` modela: o dia paga a
 *          fatia dele do custo fixo, proporcional ao que vendeu.
 */
export function montarResumoDoDia(
  venda: VendaPeriodo,
  rateioDoMes: number,
  temDespesaNoMes: boolean,
  frentistasAtivos: number
): ResumoFinanceiro {
  const despesas = rateioDoMes * venda.litros;
  const lucroReal = venda.lucroBruto - despesas;

  return {
    vendas: venda.vendas,
    litros: venda.litros,
    lucroBruto: venda.lucroBruto,
    despesas,
    rateioPorLitro: rateioDoMes,
    lucroReal,
    margemMedia: margemPercentual(lucroReal, venda.vendas),
    temDespesa: temDespesaNoMes,
    frentistasAtivos,
  };
}

async function processarPosto(
  posto: Posto,
  periodo: Periodo,
  hoje: string,
  mesCorrente: boolean
): Promise<PostoSummary> {
  const resFrentistas = await frentistaService.getAll(posto.id);
  const frentistas = isSuccess(resFrentistas) ? resFrentistas.data : [];
  const frentistasAtivos = frentistas.filter((f) => f.ativo).length;

  const [vendaHoje, vendaMes, despesasMes, pendentes, ultimoFech] = await Promise.all([
    // Em mês histórico não se consulta "hoje": a data cai fora do período exibido, e o
    // número apareceria ao lado de um mês a que não pertence.
    mesCorrente
      ? buscarVendas(posto.id, hoje, hoje)
      : Promise.resolve({ vendas: 0, litros: 0, lucroBruto: 0 }),
    buscarVendas(posto.id, periodo.inicio, periodo.fim),
    // Só as despesas do MÊS são buscadas: o dia recebe a fatia rateada, não os
    // lançamentos daquela data — ver `montarResumoDoDia`.
    buscarDespesas(posto.id, periodo.inicio, periodo.fim),
    supabase.from('Despesa').select('valor').eq('posto_id', posto.id).eq('status', 'pendente'),
    supabase
      .from('Fechamento')
      .select('data')
      .eq('posto_id', posto.id)
      .order('data', { ascending: false })
      .limit(1),
  ]);

  const resumoMes = montarResumoDoMes(vendaMes, despesasMes, frentistasAtivos);

  return {
    posto,
    hoje: montarResumoDoDia(vendaHoje, resumoMes.rateioPorLitro, resumoMes.temDespesa, frentistasAtivos),
    mes: resumoMes,
    despesasPendentes: (pendentes.data ?? []).reduce((acc, d) => acc + Number(d.valor ?? 0), 0),
    ultimoFechamento: ultimoFech.data?.[0]?.data ?? null,
  };
}

/** Soma os resumos de todos os postos num só. */
function somarResumos(resumos: ResumoFinanceiro[]): ResumoFinanceiro {
  if (resumos.length === 0) return RESUMO_VAZIO;

  const vendas = resumos.reduce((a, r) => a + r.vendas, 0);
  const litros = resumos.reduce((a, r) => a + r.litros, 0);
  const lucroBruto = resumos.reduce((a, r) => a + r.lucroBruto, 0);
  const despesas = resumos.reduce((a, r) => a + r.despesas, 0);
  const lucroReal = lucroBruto - despesas;

  return {
    vendas,
    litros,
    lucroBruto,
    despesas,
    rateioPorLitro: despesaOperacionalPorLitro(despesas, litros),
    lucroReal,
    // Margem do consolidado sai dos TOTAIS, não da média das margens: média de
    // percentual ignora o peso de cada posto e devolve número que não existe.
    margemMedia: margemPercentual(lucroReal, vendas),
    temDespesa: resumos.some((r) => r.temDespesa),
    frentistasAtivos: resumos.reduce((a, r) => a + r.frentistasAtivos, 0),
  };
}

function consolidarDados(
  summaries: PostoSummary[],
  postoPrincipal: Posto,
  mesSelecionado: string,
  mesCorrente: boolean
): DadosDashboard {
  return {
    hoje: somarResumos(summaries.map((s) => s.hoje)),
    mes: somarResumos(summaries.map((s) => s.mes)),
    posto: postoPrincipal,
    postosSummary: summaries,
    alertas: gerarAlertas(summaries, mesCorrente),
    mesSelecionado,
    ehMesCorrente: mesCorrente,
    ultimaAtualizacao: new Date().toISOString(),
  };
}

function gerarAlertas(summaries: PostoSummary[], mesCorrente: boolean): AlertaDashboard[] {
  const alerts: AlertaDashboard[] = [];

  summaries.forEach((s) => {
    // Sem despesa lançada o lucro do mês está inflado — avisar vale mais que qualquer KPI.
    if (!s.mes.temDespesa && s.mes.vendas > 0) {
      alerts.push({
        type: 'warning',
        posto: s.posto.nome,
        message: 'Nenhuma despesa lançada no mês — o lucro exibido é bruto, não real.',
      });
    }

    if (s.mes.temDespesa && s.mes.margemMedia < 15 && s.mes.margemMedia > 0) {
      alerts.push({
        type: 'warning',
        posto: s.posto.nome,
        message: `Margem real do mês: ${s.mes.margemMedia.toFixed(1)}%`,
      });
    }

    // Só no mês corrente: em mês histórico a aba "Hoje" vem zerada de propósito, e o
    // alerta apontaria prejuízo num dia que nem pertence ao período exibido.
    if (mesCorrente && s.hoje.lucroReal < 0) {
      alerts.push({
        type: 'danger',
        posto: s.posto.nome,
        message: 'Prejuízo operacional hoje',
      });
    }

    if (!mesCorrente && s.mes.lucroReal < 0) {
      alerts.push({
        type: 'danger',
        posto: s.posto.nome,
        message: 'O mês fechou no prejuízo depois das despesas.',
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      posto: 'Geral',
      message: 'Operação estável. Sem alertas críticos.',
    });
  }

  return alerts;
}
