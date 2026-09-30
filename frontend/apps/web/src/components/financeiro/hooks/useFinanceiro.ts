/**
 * Hook para gerenciamento de dados financeiros consolidados.
 *
 * Busca vendas, despesas, recebimentos e compras do período selecionado,
 * agregando em métricas consolidadas de receita, despesa e lucro.
 *
 * [03/09/2026] O lucro deixou de vir do carimbo `Fechamento.lucro_*` (que a UI
 * nunca gravou) e passou a ser calculado da fonte: receita = `Leitura`, custo =
 * litros vendidos × custo médio de compra do período (`custoLitrosVendidos`,
 * modelo da planilha). Falta de caixa não entra — a planilha não desconta.
 * A composição mora em `./calculos-financeiro`.
 */
// [01/02 11:25] Integrado receitas extras e categorias dinâmicas; Tipagem estrita aplicada sem uso de 'any'.
import { useState, useEffect, useCallback } from 'react';
import { type ResumoFinanceiro } from './calculos-financeiro';
import { montarDadosFinanceiros } from './montar-dados-financeiros';
import { insumosDoSupabase, type CompraDoSupabase, type RecebimentoDoSupabase, type VendaDoSupabase } from './insumos-financeiros';
import { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import {
  leituraService,
  despesaService,
  receitaService,
  recebimentoService,
  compraService
} from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';
import type { DBDespesa as Despesa } from '../../../types/database';
import { Receita } from '../../../services/api/receita.service';

// [14/01 15:40] Expondo tipos financeiros para uso centralizado em componentes
/**
 * Interface que representa uma transação financeira unificada.
 */
export interface Transacao {
  readonly id: string;
  /** Tipo da transação: receita (entrada) ou despesa (saída) */
  tipo: 'receita' | 'despesa';
  /** Categoria da transação para agrupamento */
  categoria: string;
  /** Descrição detalhada da transação */
  descricao: string;
  /** Valor monetário da transação */
  valor: number;
  /** Data da ocorrência (ISO string ou YYYY-MM-DD) */
  data: string;
  /** Origem do dado (tabela fonte) */
  origem: 'venda' | 'recebimento' | 'despesa' | 'compra' | 'receita_extra';
}

/**
 * Interface com os dados financeiros agregados.
 *
 * `despesas.total`, `despesas.compras` e `lucro.*` são `null` quando o custo não é
 * apurável — algum produto vendido sem compra no período (`produtosSemCompra` diz qual).
 */
export interface DadosFinanceiros extends ResumoFinanceiro {
  /** Produtos com venda e sem compra no período — o motivo de o lucro vir `null`. */
  produtosSemCompra: readonly string[];
  /** Lista de transações detalhadas */
  transacoes: Transacao[];
}

/**
 * Interface de retorno do hook useFinanceiro.
 */
interface UseFinanceiroReturn {
  /** Dados financeiros agregados e calculados */
  dados: DadosFinanceiros;
  /** Flag indicando se os dados estão sendo carregados */
  carregando: boolean;
  /** Mensagem de erro, se houver */
  erro: string | null;
  /** Função para forçar recarregamento dos dados */
  recarregar: () => Promise<void>;
}

const DADOS_INICIAIS: DadosFinanceiros = {
  receitas: { total: 0, vendas: 0, extras: 0 },
  despesas: { total: 0, operacionais: 0, compras: 0 },
  lucro: { bruto: 0, liquido: 0, margem: 0 },
  produtosSemCompra: [],
  transacoes: []
};

/**
 * Hook principal para orquestração de dados financeiros.
 * 
 * @param filtros - Filtros de data e contexto aplicados
 * @returns Dados agregados, estado de carregamento e função de refresh
 */
export function useFinanceiro(filtros: FiltrosFinanceiros): UseFinanceiroReturn {
  const [dados, setDados] = useState<DadosFinanceiros>(DADOS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const { dataInicio, dataFim, postoId } = filtros;

      const [vendasRes, despesasRes, receitasRes, recebimentosRes, comprasRes] = await Promise.all([
        leituraService.getByDateRange(dataInicio, dataFim, postoId),
        despesaService.getByDateRange(dataInicio, dataFim, postoId),
        receitaService.getByDateRange(dataInicio, dataFim, postoId),
        recebimentoService.getByDateRange(dataInicio, dataFim, postoId),
        compraService.getByDateRange(dataInicio, dataFim, postoId)
      ]);

      const vendas = (isSuccess(vendasRes) ? vendasRes.data : []) as VendaDoSupabase[];
      const despesas = (isSuccess(despesasRes) ? despesasRes.data : []) as Despesa[];
      const receitasExtras = (isSuccess(receitasRes) ? receitasRes.data : []) as Receita[];
      const recebimentos = (isSuccess(recebimentosRes) ? recebimentosRes.data : []) as RecebimentoDoSupabase[];
      const compras = (isSuccess(comprasRes) ? comprasRes.data : []) as CompraDoSupabase[];

      // [#103] A montagem (transações, custo dos litros vendidos, resumo) mora em
      // `montarDadosFinanceiros`, a MESMA para o Supabase e para a API. Aqui só a tradução das linhas.
      setDados(montarDadosFinanceiros(insumosDoSupabase({ vendas, recebimentos, receitas: receitasExtras, despesas, compras }), filtros));

    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      setErro('Falha ao carregar dados financeiros.');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return {
    dados,
    carregando,
    erro,
    recarregar: carregarDados
  };
}
