/**
 * Hook para gerenciamento de dados financeiros consolidados.
 *
 * Busca vendas, despesas, recebimentos e compras do período selecionado,
 * agregando em métricas consolidadas de receita, despesa e lucro.
 */
// [27/01 10:35] Adicionado fechamentoService para buscar dados reais de lucro
import { useState, useEffect, useCallback } from 'react';
import { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import {
  leituraService,
  despesaService,
  recebimentoService,
  compraService,
  fechamentoService
} from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';

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
  origem: 'venda' | 'recebimento' | 'despesa' | 'compra';
}

/**
 * Interface com os dados financeiros agregados.
 */
export interface DadosFinanceiros {
  /** Métricas de Receitas */
  receitas: {
    total: number;
    vendas: number;
    recebimentos: number;
  };
  /** Métricas de Despesas */
  despesas: {
    total: number;
    operacionais: number;
    compras: number;
  };
  /** Métricas de Lucratividade */
  lucro: {
    bruto: number;
    liquido: number;
    margem: number;
  };
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
  receitas: { total: 0, vendas: 0, recebimentos: 0 },
  despesas: { total: 0, operacionais: 0, compras: 0 },
  lucro: { bruto: 0, liquido: 0, margem: 0 },
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

      console.log('[useFinanceiro] Filtros:', { dataInicio, dataFim, postoId });

      // [27/01 10:36] Buscar dados reais de lucro dos fechamentos + dados detalhados
      const [lucroRes, vendasRes, despesasRes, recebimentosRes, comprasRes] = await Promise.all([
        fechamentoService.getLucroPorPeriodo(dataInicio, dataFim, postoId),
        leituraService.getByDateRange(dataInicio, dataFim, postoId),
        despesaService.getByDateRange(dataInicio, dataFim, postoId),
        recebimentoService.getByDateRange(dataInicio, dataFim, postoId),
        compraService.getByDateRange(dataInicio, dataFim, postoId)
      ]);

      console.log('[useFinanceiro] despesasRes:', despesasRes);

      const vendas = isSuccess(vendasRes) ? vendasRes.data : [];
      const despesas = isSuccess(despesasRes) ? despesasRes.data : [];
      const recebimentos = isSuccess(recebimentosRes) ? recebimentosRes.data : [];
      const compras = isSuccess(comprasRes) ? comprasRes.data : [];

      console.log('[useFinanceiro] Despesas encontradas:', despesas.length, despesas);
      console.log('[useFinanceiro] Dados de Lucro (Fechamento):', lucroRes);

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
      const totalRecebimentos = recebimentos.reduce((acc, r) => acc + (r.valor || 0), 0);
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

      // 3. Despesas (Despesa)
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

      // 4. Compras (Despesa) - Usar custo real dos fechamentos
      const totalCompras = compras.reduce((acc, c) => acc + (c.valor_total || 0), 0);
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

      // [27/01 10:45] Usar dados REAIS de lucro dos Fechamentos
      // CORREÇÃO CRÍTICA: NÃO somar vendas + recebimentos (duplicação!)
      // Recebimentos JÁ estão contabilizados nas vendas via formas de pagamento
      const dadosLucro = isSuccess(lucroRes) ? lucroRes.data : null;

      console.log('[useFinanceiro] Dados de Lucro (Fechamentos):', dadosLucro);

      // RECEITAS: Usar APENAS receita_bruta dos fechamentos
      // Isso evita duplicação (vendas via bicos já incluem todas formas de pagamento)
      const receitasTotal = dadosLucro?.receita_bruta || totalVendas;
      
      // DESPESAS: Usar dados reais dos fechamentos
      // custo_combustiveis = custo REAL dos litros vendidos (custo médio ponderado)
      // taxas_pagamento = taxas de cartão calculadas
      // despesas operacionais = extras cadastradas (energia, manutenção, etc)
      const despesasTotal = dadosLucro 
        ? (dadosLucro.custo_combustiveis + dadosLucro.taxas_pagamento + dadosLucro.faltas + totalDespesasOps)
        : (totalDespesasOps + totalCompras);

      // LUCRO: Usar cálculo REAL do sistema
      // lucro_bruto = vendas - custo_combustiveis_vendidos
      // lucro_liquido = lucro_bruto - taxas - faltas - despesas_ops
      const lucroBruto = dadosLucro?.lucro_bruto || (receitasTotal - totalCompras);
      const lucroLiquido = dadosLucro?.lucro_liquido || (receitasTotal - despesasTotal);
      const margem = dadosLucro?.margem_liquida_pct || (receitasTotal > 0 ? (lucroLiquido / receitasTotal) * 100 : 0);

      console.log('[useFinanceiro] Resumo Calculado:', {
        receitasTotal,
        despesasTotal,
        lucroBruto,
        lucroLiquido,
        margem,
        dadosLucro
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

      // [27/01 10:42] Dados ajustados para usar lucro REAL do sistema
      setDados({
        receitas: {
          total: receitasTotal,  // Receita bruta dos fechamentos
          vendas: receitasTotal, // Vendas = Receita (não duplicar)
          recebimentos: 0        // Zero para não duplicar (recebimentos JÁ estão em vendas)
        },
        despesas: {
          total: despesasTotal,
          operacionais: totalDespesasOps,
          compras: dadosLucro?.custo_combustiveis || totalCompras  // Custo REAL vendido
        },
        lucro: {
          bruto: lucroBruto,     // Lucro bruto REAL (vendas - custo combustíveis)
          liquido: lucroLiquido, // Lucro líquido REAL (bruto - taxas - faltas - despesas)
          margem                 // Margem líquida %
        },
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
