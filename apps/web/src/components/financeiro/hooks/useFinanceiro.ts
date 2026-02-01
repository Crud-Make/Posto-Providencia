/**
 * Hook para gerenciamento de dados financeiros consolidados.
 *
 * Busca vendas, despesas, recebimentos e compras do período selecionado,
 * agregando em métricas consolidadas de receita, despesa e lucro.
 */
// [27/01 10:35] Adicionado fechamentoService para buscar dados reais de lucro
// [01/02 11:25] Integrado receitas extras e categorias dinâmicas; Tipagem estrita aplicada sem uso de 'any'.
import { useState, useEffect, useCallback } from 'react';
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

interface LucroData {
  receita_bruta: number;
  custo_combustiveis: number;
  lucro_bruto: number;
  taxas_pagamento: number;
  faltas: number;
  lucro_liquido: number;
  margem_bruta_pct: number;
  margem_liquida_pct: number;
  dias_operados: number;
}

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
 */
export interface DadosFinanceiros {
  /** Métricas de Receitas */
  receitas: {
    total: number;
    vendas: number;
    extras: number;
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
  receitas: { total: 0, vendas: 0, extras: 0 },
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
      const [lucroRes, vendasRes, despesasRes, receitasRes, recebimentosRes, comprasRes] = await Promise.all([
        fechamentoService.getLucroPorPeriodo(dataInicio, dataFim, postoId),
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
      const dadosLucro = (isSuccess(lucroRes) ? lucroRes.data : null) as LucroData | null;

      console.log('[useFinanceiro] Dados de Lucro (Fechamentos):', dadosLucro);

      // RECEITAS: Usar receita_bruta dos fechamentos + receitas extras
      const receitasOperacionais = dadosLucro?.receita_bruta || totalVendas;
      const receitasTotal = receitasOperacionais + totalReceitasExtras;

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
          total: receitasTotal,
          vendas: receitasOperacionais,
          extras: totalReceitasExtras
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
