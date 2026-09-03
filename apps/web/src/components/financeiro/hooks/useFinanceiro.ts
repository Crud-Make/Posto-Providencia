/**
 * Hook para gerenciamento de dados financeiros consolidados.
 *
 * Busca vendas, despesas, recebimentos e compras do período selecionado,
 * agregando em métricas consolidadas de receita, despesa e lucro.
 *
 * [03/09/2026] O lucro deixou de vir do carimbo `Fechamento.lucro_*` (que a UI
 * nunca gravou) e passou a ser calculado da fonte: receita = `Leitura`, custo =
 * litros vendidos × custo médio de compra do período (`custoLitrosVendidos`,
 * modelo da planilha), faltas = diferenças positivas dos fechamentos. A
 * composição mora em `./calculos-financeiro`.
 */
// [01/02 11:25] Integrado receitas extras e categorias dinâmicas; Tipagem estrita aplicada sem uso de 'any'.
import { useState, useEffect, useCallback } from 'react';
import { custoLitrosVendidos, type ProdutoDoPeriodo } from '@posto/utils';
import { resumoFinanceiro, totalFaltas, type ResumoFinanceiro } from './calculos-financeiro';
import { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import {
  leituraService,
  despesaService,
  receitaService,
  recebimentoService,
  compraService,
  fechamentoService
} from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';
import type {
  Leitura,
  Bico,
  Combustivel,
  Bomba,
  Recebimento,
  Compra,
  DBDespesa as Despesa,
  FormaPagamento,
  Fechamento,
  Fornecedor
} from '../../../types/database';
import { Receita } from '../../../services/api/receita.service';

// Extensão de tipos para incluir joins
type RecebimentoComJoins = Recebimento & {
  forma_pagamento?: FormaPagamento | null;
  fechamento?: Partial<Fechamento> | null;
};

type CompraComJoins = Compra & {
  combustivel?: Combustivel | null;
  fornecedor?: Fornecedor | null;
};

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

      const [diferencasRes, vendasRes, despesasRes, receitasRes, recebimentosRes, comprasRes] = await Promise.all([
        fechamentoService.getDiferencasPorPeriodo(dataInicio, dataFim, postoId),
        leituraService.getByDateRange(dataInicio, dataFim, postoId),
        despesaService.getByDateRange(dataInicio, dataFim, postoId),
        receitaService.getByDateRange(dataInicio, dataFim, postoId),
        recebimentoService.getByDateRange(dataInicio, dataFim, postoId),
        compraService.getByDateRange(dataInicio, dataFim, postoId)
      ]);

      const vendas = (isSuccess(vendasRes) ? vendasRes.data : []) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
      const despesas = (isSuccess(despesasRes) ? despesasRes.data : []) as Despesa[];
      const receitasExtras = (isSuccess(receitasRes) ? receitasRes.data : []) as Receita[];
      const recebimentos = (isSuccess(recebimentosRes) ? recebimentosRes.data : []) as RecebimentoComJoins[];
      const compras = (isSuccess(comprasRes) ? comprasRes.data : []) as CompraComJoins[];
      const diferencas = isSuccess(diferencasRes) ? diferencasRes.data : [];

      // [27/01 10:38] Processar Transações
      const listaTransacoes: Transacao[] = [];

      // 1. Vendas (Receita)
      const totalVendas = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
      vendas.forEach(v => {
        listaTransacoes.push({
          id: `venda-${v.id}`,
          tipo: 'receita',
          categoria: 'Venda de Combustível',
          descricao: `Venda ${v.bico.combustivel.nome} - Bico ${v.bico.numero}`,
          valor: v.valor_total || 0,
          data: v.data,
          origem: 'venda'
        });
      });

      // 2. Recebimentos (Receita)
      // Nota: recebimentos entram na lista de transações para detalhamento, mas o total
      // NÃO é somado ao lucro (já contabilizado nas vendas via formas de pagamento) — ver
      // comentário "CORREÇÃO CRÍTICA" abaixo.
      recebimentos.forEach(r => {
        listaTransacoes.push({
          id: `rec-${r.id}`,
          tipo: 'receita',
          categoria: 'Recebimento',
          descricao: `Recebimento ${r.forma_pagamento?.nome || 'Diversos'}`,
          valor: r.valor,
          data: r.fechamento?.data || dataInicio,
          origem: 'recebimento'
        });
      });

      // 3. Receitas Extras (Receita)
      const totalReceitasExtras = receitasExtras.reduce((acc, r) => acc + (r.valor || 0), 0);
      receitasExtras.forEach(r => {
        listaTransacoes.push({
          id: `recextra-${r.id}`,
          tipo: 'receita',
          categoria: r.Categoria?.nome || 'Outros',
          descricao: r.descricao,
          valor: r.valor,
          data: r.data,
          origem: 'receita_extra'
        });
      });

      // 4. Despesas (Despesa)
      const totalDespesasOps = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
      despesas.forEach(d => {
        listaTransacoes.push({
          id: `desp-${d.id}`,
          tipo: 'despesa',
          categoria: d.categoria || 'Geral',
          descricao: d.descricao,
          valor: d.valor,
          data: d.data,
          origem: 'despesa'
        });
      });

      // 5. Compras — entram na lista como saída de caixa; no lucro o que pesa é o
      // custo dos LITROS VENDIDOS (abaixo), não a compra paga no período.
      compras.forEach(c => {
        listaTransacoes.push({
          id: `compra-${c.id}`,
          tipo: 'despesa',
          categoria: 'Compra de Combustível',
          descricao: `Compra ${c.combustivel?.nome || 'Combustível'} - ${c.fornecedor?.nome || 'Fornecedor'}`,
          valor: c.valor_total,
          data: c.data,
          origem: 'compra'
        });
      });

      // Custo dos litros vendidos: por produto, litros da Leitura × custo médio de
      // compra do período (modelo da planilha). Sem compra de um produto vendido, o
      // custo é `null` e o card diz qual — nunca zero disfarçado de lucro.
      const litrosPorProduto = new Map<string, number>();
      for (const v of vendas) {
        const produto = v.bico.combustivel.nome;
        litrosPorProduto.set(produto, (litrosPorProduto.get(produto) ?? 0) + Number(v.litros_vendidos || 0));
      }
      const comprasPorProduto = new Map<string, { litros: number; valorTotal: number }[]>();
      for (const c of compras) {
        const produto = c.combustivel?.nome;
        if (!produto) continue;
        const lista = comprasPorProduto.get(produto) ?? [];
        lista.push({ litros: Number(c.quantidade_litros || 0), valorTotal: Number(c.valor_total || 0) });
        comprasPorProduto.set(produto, lista);
      }
      const produtos: ProdutoDoPeriodo[] = [...litrosPorProduto].map(([produto, litrosVendidos]) => ({
        produto,
        litrosVendidos,
        compras: comprasPorProduto.get(produto) ?? [],
      }));
      const custo = custoLitrosVendidos(produtos);

      // Recebimentos NÃO entram na receita: já estão nas vendas via formas de pagamento.
      const resumo = resumoFinanceiro({
        receitaVendas: totalVendas,
        receitasExtras: totalReceitasExtras,
        custoLitrosVendidos: custo.custo,
        faltas: totalFaltas(diferencas),
        despesasOps: totalDespesasOps,
      });

      // Ordenar transações por data (decrescente)
      listaTransacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Filtrar transações se houver filtros locais (ex: categoria, tipo)
      // O filtro de data já foi aplicado na query
      let transacoesFiltradas = listaTransacoes;
      if (filtros.tipoTransacao && filtros.tipoTransacao !== 'todas') {
        transacoesFiltradas = transacoesFiltradas.filter(t => t.tipo === filtros.tipoTransacao);
      }
      if (filtros.categoria) {
        transacoesFiltradas = transacoesFiltradas.filter(t => t.categoria === filtros.categoria);
      }

      setDados({
        ...resumo,
        produtosSemCompra: custo.produtosSemCompra,
        transacoes: transacoesFiltradas
      });

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
