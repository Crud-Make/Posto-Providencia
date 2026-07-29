/**
 * Hook para gerenciamento de filtros financeiros.
 *
 * Controla período selecionado, tipos de transação e outras
 * opções de filtro da tela financeira.
 */
import { useState, useCallback, useMemo } from 'react';

/**
 * Interface que define os filtros disponíveis para o painel financeiro.
 */
export interface FiltrosFinanceiros {
  /** Data inicial do período (YYYY-MM-DD) */
  dataInicio: string;
  /** Data final do período (YYYY-MM-DD) */
  dataFim: string;
  /** Tipo de transação para filtragem (opcional) */
  tipoTransacao?: 'receita' | 'despesa' | 'todas';
  /** Categoria específica para filtragem (opcional) */
  categoria?: string;
  /** ID do posto para filtragem multi-unidade (opcional) */
  postoId?: number;
}

/**
 * Interface de retorno do hook useFiltrosFinanceiros.
 */
interface UseFiltrosFinanceirosReturn {
  /** Estado atual dos filtros */
  filtros: FiltrosFinanceiros;
  /** Função para atualizar um campo específico dos filtros */
  atualizar: (campo: keyof FiltrosFinanceiros, valor: FiltrosFinanceiros[keyof FiltrosFinanceiros]) => void;
  /** Função para resetar os filtros para o estado inicial (mês atual) */
  resetar: () => void;
  /** Função para aplicar presets de data (hoje, semana, mês, ano) */
  aplicarPreset: (preset: 'hoje' | 'semana' | 'mes' | 'ano') => void;
}

/**
 * Hook customizado para gerenciar o estado dos filtros financeiros.
 * 
 * @param initialPostoId - ID inicial do posto (opcional)
 * @returns Objeto com estado dos filtros e funções de manipulação
 */
export function useFiltrosFinanceiros(initialPostoId?: number): UseFiltrosFinanceirosReturn {
  const getInitialDates = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
      dataInicio: inicioMes.toISOString().split('T')[0],
      dataFim: fimMes.toISOString().split('T')[0]
    };
  };

  const [filtrosBase, setFiltrosBase] = useState<FiltrosFinanceiros>({
    ...getInitialDates(),
    tipoTransacao: 'todas',
    postoId: initialPostoId
  });

  // [26/07 refactor] postoId é sempre um espelho da prop `initialPostoId`: em vez de
  // sincronizar via setState-em-effect (causa cascata de renders), deriva-se direto
  // no render com useMemo — sem atraso de um ciclo e sem risco de loop.
  const filtros = useMemo<FiltrosFinanceiros>(
    () => ({ ...filtrosBase, postoId: initialPostoId || filtrosBase.postoId }),
    [filtrosBase, initialPostoId]
  );

  const atualizar = useCallback((campo: keyof FiltrosFinanceiros, valor: FiltrosFinanceiros[keyof FiltrosFinanceiros]) => {
    setFiltrosBase(prev => ({ ...prev, [campo]: valor }));
  }, []);

  const resetar = useCallback(() => {
    setFiltrosBase({
      ...getInitialDates(),
      tipoTransacao: 'todas',
      postoId: initialPostoId
    });
  }, [initialPostoId]);

  const aplicarPreset = useCallback((preset: 'hoje' | 'semana' | 'mes' | 'ano') => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date = hoje;

    switch (preset) {
      case 'hoje':
        inicio = hoje;
        break;
      case 'semana':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
    }

    setFiltrosBase(prev => ({
      ...prev,
      dataInicio: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0]
    }));
  }, []);

  return {
    filtros,
    atualizar,
    resetar,
    aplicarPreset
  };
}
