import { Posto } from '../../types/database/index';

/**
 * Resumo financeiro consolidado para um período específico.
 *
 * @remarks [31/07] O campo `lucroEstimado` virou {@link ResumoFinanceiro.lucroReal}. Não foi
 *          troca de nome cosmética: o valor antigo vinha do `lucro_liquido` da RPC, que **já
 *          descontava as despesas**, e a tela descontava outra vez. Enquanto a tabela
 *          `Despesa` esteve vazia o erro valia zero e ninguém viu. Com julho carregado
 *          (R$ 18.585,76), o resultado exibido caía de R$ 19.084,23 para R$ 440,96.
 */
export interface ResumoFinanceiro {
  /** Receita bruta do período (soma de `Leitura.valor_total`). */
  vendas: number;
  /** Litros vendidos no período — denominador do rateio de despesa. */
  litros: number;
  /** Receita menos o custo de compra do combustível, antes das despesas operacionais. */
  lucroBruto: number;
  /** Despesas operacionais do período. Zero quando não há lançamento — ver `temDespesa`. */
  despesas: number;
  /** Despesa operacional rateada por litro (R$/L) — `despesas ÷ litros`. */
  rateioPorLitro: number;
  /** Lucro real: `lucroBruto − despesas`. É o número que responde "quanto sobrou". */
  lucroReal: number;
  /** `lucroReal ÷ vendas × 100`. */
  margemMedia: number;
  /**
   * `false` quando não há despesa lançada no período.
   *
   * @remarks Sem isso a tela exibiria o lucro bruto como se fosse o líquido. A ausência de
   *          despesa precisa aparecer como ausência, não como lucro alto.
   */
  temDespesa: boolean;
  frentistasAtivos: number;
  /**
   * Produtos vendidos no período sem compra lançada no mês. Não vazio = o custo não é
   * apurável, e a tela mostra o lucro como "não apurável" em vez de um número.
   *
   * @remarks Só o caminho da API preenche (DECISÃO 2 de `docs/design/agregacao.md`: sem compra
   *          não se inventa custo). O caminho Supabase segue a RPC, que cai no `preco_custo` do
   *          cadastro, e deixa a lista vazia.
   */
  produtosSemCompra: readonly string[];
}

/**
 * Estrutura completa de dados do dashboard.
 */
export interface DadosDashboard {
  /**
   * Resumo do dia de hoje.
   *
   * @remarks Vem **zerado** quando `ehMesCorrente` é `false`: hoje não pertence ao mês
   *          histórico exibido, e mostrar o número ali confundiria os dois períodos.
   */
  hoje: ResumoFinanceiro;
  /** Resumo do mês selecionado — fechado se histórico, até hoje se corrente. */
  mes: ResumoFinanceiro;
  posto: Posto;
  postosSummary: PostoSummary[];
  alertas: AlertaDashboard[];
  /** Mês exibido, ISO local `aaaa-mm`. */
  mesSelecionado: string;
  /** `true` quando o mês exibido é o mês em curso. */
  ehMesCorrente: boolean;
  ultimaAtualizacao: string;
}

/**
 * Resumo individual por posto (legado, mantido para compatibilidade).
 */
export interface PostoSummary {
  posto: Posto;
  hoje: ResumoFinanceiro;
  mes: ResumoFinanceiro;
  despesasPendentes: number;
  ultimoFechamento: string | null;
}

/**
 * Alerta gerado pelo sistema.
 */
export interface AlertaDashboard {
  type: 'warning' | 'danger' | 'info' | 'success';
  posto: string;
  message: string;
}

/**
 * Aba de período do painel.
 *
 * @remarks [02/08] `'semana'` saiu. Ela existia na barra como "7 Dias", mas o hook não
 *          buscava sete dias: caía no `else` e exibia o **mês inteiro** sob rótulo de
 *          semana. Rótulo que mente sobre o período é pior que aba faltando.
 */
export type PeriodoFiltro = 'hoje' | 'mes';
