/**
 * Hook para gerenciamento de autosave no localStorage
 *
 * @remarks
 * Salva automaticamente o estado do fechamento no localStorage
 * e restaura ao montar o componente. Evita perda de dados durante edição.
 *
 * SEGURANÇA: Só restaura rascunhos da mesma data para evitar
 * sobrescrever dados de fechamentos de datas diferentes
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import { useState, useEffect, useMemo } from 'react';
import { chaveRascunhoFechamento } from '../../../utils/rascunho-fechamento';

/**
 * Estrutura do rascunho salvo no localStorage
 */
interface RascunhoFechamento {
  leituras: Record<number, { inicial: string; fechamento: string }>;
  dataSelecionada: string;
  sessoesFrentistas: unknown[]; // Tipagem genérica para flexibilidade
}

/**
 * Parâmetros do hook useAutoSave
 */
interface ParametrosAutoSave {
  postoId: number | null;
  dataSelecionada: string;
  leituras: Record<number, { inicial: string; fechamento: string }>;
  sessoesFrentistas: unknown[];
  carregando: boolean;
  salvando: boolean;
}

/**
 * Retorno do hook useAutoSave
 */
interface RetornoAutoSave {
  restaurado: boolean;
  marcarComoRestaurado: () => void;
  limparAutoSave: () => void;
  rascunhoRestaurado: RascunhoFechamento | null;
}

/**
 * Hook customizado para autosave de fechamento diário
 *
 * @param parametros - Configurações e estados a serem salvos
 * @returns Controles e estado do autosave
 *
 * @remarks
 * - Salva automaticamente após mudanças (debounced)
 * - Restaura rascunho ao montar componente
 * - Valida data do rascunho antes de restaurar
 * - Reseta estado ao trocar de posto
 *
 * @example
 * const { restaurado, rascunhoRestaurado } = useAutoSave({
 *   postoId: 1,
 *   dataSelecionada: '2026-01-08',
 *   leituras: {...},
 *   sessoesFrentistas: [...],
 *   carregando: false,
 *   salvando: false
 * });
 */
export const useAutoSave = (parametros: ParametrosAutoSave): RetornoAutoSave => {
  const {
    postoId,
    dataSelecionada,
    leituras,
    sessoesFrentistas,
    carregando,
    salvando
  } = parametros;

  const [restaurado, setRestaurado] = useState(false);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState<RascunhoFechamento | null>(null);

  // A chave mora em `utils/rascunho-fechamento` porque Configurações também
  // precisa dela para limpar o rascunho ao apagar um mês. Duplicar a string
  // faria um lado parar de limpar em silêncio no dia em que ela mudasse.
  const CHAVE_AUTOSAVE = useMemo(() => chaveRascunhoFechamento(postoId), [postoId]);

  /**
   * Reseta estado de restauração quando troca de posto
   */
  useEffect(() => {
    setRestaurado(false);
    setRascunhoRestaurado(null);
  }, [postoId]);

  /**
   * Restaura rascunho do localStorage quando carregamento finalizar
   *
   * @remarks
   * VALIDAÇÃO DE SEGURANÇA: Só restaura se o rascunho for da mesma data
   * Isso corrige o bug onde leituras de ontem sobrescreviam o formulário de hoje
   */
  useEffect(() => {
    if (!carregando && !restaurado) {
      try {
        const rascunhoJson = localStorage.getItem(CHAVE_AUTOSAVE);

        if (rascunhoJson) {
          const rascunho = JSON.parse(rascunhoJson) as RascunhoFechamento;

          // Validação de Segurança: Só restaura se for da mesma data
          if (rascunho.dataSelecionada === dataSelecionada) {
            setRascunhoRestaurado(rascunho);
            console.log('✅ Rascunho restaurado com sucesso para:', dataSelecionada);
          } else {
            console.warn(
              '🧹 Rascunho descartado pois pertence a outra data:',
              rascunho.dataSelecionada
            );
            localStorage.removeItem(CHAVE_AUTOSAVE);
          }
        }
      } catch (erro) {
        console.error('❌ Erro ao restaurar rascunho:', erro);
      } finally {
        setRestaurado(true);
      }
    }
  }, [carregando, restaurado, CHAVE_AUTOSAVE, dataSelecionada]);

  /**
   * Salva automaticamente no localStorage após mudanças
   *
   * @remarks
   * Só salva após restauração inicial para não sobrescrever
   * rascunho antes de ser carregado
   */
  useEffect(() => {
    if (!carregando && !salvando && restaurado) {
      const rascunho: RascunhoFechamento = {
        leituras,
        dataSelecionada,
        sessoesFrentistas
      };

      try {
        localStorage.setItem(CHAVE_AUTOSAVE, JSON.stringify(rascunho));
      } catch (erro) {
        console.error('❌ Erro ao salvar rascunho:', erro);
      }
    }
  }, [
    leituras,
    dataSelecionada,
    sessoesFrentistas,
    carregando,
    salvando,
    restaurado,
    CHAVE_AUTOSAVE
  ]);

  /**
   * Marca manualmente como restaurado
   */
  const marcarComoRestaurado = () => {
    setRestaurado(true);
  };

  /**
   * Limpa rascunho do localStorage
   *
   * @remarks
   * Útil após salvar com sucesso ou cancelar edição
   */
  const limparAutoSave = () => {
    try {
      localStorage.removeItem(CHAVE_AUTOSAVE);
      setRascunhoRestaurado(null);
      console.log('🧹 Rascunho limpo do localStorage');
    } catch (erro) {
      console.error('❌ Erro ao limpar rascunho:', erro);
    }
  };

  return {
    restaurado,
    marcarComoRestaurado,
    limparAutoSave,
    rascunhoRestaurado
  };
};
