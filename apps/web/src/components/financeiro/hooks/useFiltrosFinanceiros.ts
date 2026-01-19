/**
 * Hook para gerenciamento de filtros financeiros.
 *
 * Controla período selecionado, tipos de transação e outras
 * opções de filtro da tela financeira.
 */
import { useState, useCallback, useEffect } from 'react';

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

  const [filtros, setFiltros] = useState<FiltrosFinanceiros>({
    ...getInitialDates(),
    tipoTransacao: 'todas',
    postoId: initialPostoId
  });

  // Atualizar postoId quando prop mudar
  useEffect(() => {
    if (initialPostoId) {
      setFiltros(prev => ({ ...prev, postoId: initialPostoId }));
    }
  }, [initialPostoId]);

  const atualizar = useCallback((campo: keyof FiltrosFinanceiros, valor: FiltrosFinanceiros[keyof FiltrosFinanceiros]) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  }, []);

  const resetar = useCallback(() => {
    setFiltros({
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

    setFiltros(prev => ({
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
