import { despesaOperacionalPorLitro, margemPercentual } from '@posto/utils';
import type { Posto } from '../../../types/database/index';
import type { AlertaDashboard, DadosDashboard, PostoSummary, ResumoFinanceiro } from '../types';

/**
 * Montagem do resumo da Visão do Proprietário — pura, sem fonte de dado.
 *
 * @remarks Saiu de `useDashboardProprietario.ts` sem mudar uma conta (#100): as duas fontes
 *          (Supabase e API Laravel) entregam a mesma {@link VendaPeriodo} e as mesmas despesas, e
 *          daqui para frente o caminho é um só. O que é novo é só `produtosSemCompra`, que o
 *          caminho Supabase sempre deixa vazio (a RPC cai no `preco_custo` do cadastro) e o
 *          caminho da API preenche (DECISÃO 2 do `docs/design/agregacao.md`).
 */

/** Venda e lucro bruto do período. */
export interface VendaPeriodo {
  vendas: number;
  litros: number;
  lucroBruto: number;
  /**
   * Produtos vendidos sem compra no mês: o custo deles não é apurável, e o `lucroBruto` acima
   * cobre só os demais. Ausente = todos apurados (é o caminho Supabase, pela RPC).
   */
  produtosSemCompra?: readonly string[];
}

/** Resumo zerado — usado quando não há venda no período. */
export const RESUMO_VAZIO: ResumoFinanceiro = {
  vendas: 0,
  litros: 0,
  lucroBruto: 0,
  despesas: 0,
  rateioPorLitro: 0,
  lucroReal: 0,
  margemMedia: 0,
  temDespesa: false,
  frentistasAtivos: 0,
  produtosSemCompra: [],
};

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
    produtosSemCompra: venda.produtosSemCompra ?? [],
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
    produtosSemCompra: venda.produtosSemCompra ?? [],
  };
}

/** Soma os resumos de todos os postos num só. */
export function somarResumos(resumos: ResumoFinanceiro[]): ResumoFinanceiro {
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
    // Um posto sem custo apurável deixa a rede inteira sem lucro apurável.
    produtosSemCompra: [...new Set(resumos.flatMap((r) => r.produtosSemCompra))],
  };
}

export function consolidarDados(
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

/** Alertas que dependem do lucro — só fazem sentido quando o custo do mês é apurável. */
function alertasDeLucro(s: PostoSummary, mesCorrente: boolean): AlertaDashboard[] {
  const alerts: AlertaDashboard[] = [];

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

  return alerts;
}

export function gerarAlertas(summaries: PostoSummary[], mesCorrente: boolean): AlertaDashboard[] {
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

    // Sem compra do produto no mês o custo não é apurável: nem margem nem prejuízo se afirmam.
    if (s.mes.produtosSemCompra.length > 0) {
      alerts.push({
        type: 'warning',
        posto: s.posto.nome,
        message: `Sem compra lançada no mês para ${s.mes.produtosSemCompra.join(', ')} — custo e lucro não apuráveis.`,
      });
      return;
    }

    alerts.push(...alertasDeLucro(s, mesCorrente));
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
