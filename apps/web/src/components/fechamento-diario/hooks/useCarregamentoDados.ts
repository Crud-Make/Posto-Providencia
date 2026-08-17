/**
 * Hook para gerenciamento de carregamento de dados gerais
 *
 * @remarks
 * Centraliza carregamento de bicos e frentistas
 * e configuração de realtime subscriptions do Supabase
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [20/01 10:00] Adição de updateBicoPrice para edição local de preços
// Motivo: Permitir ajuste rápido de preço durante o fechamento sem alterar cadastro
import { useState, useCallback, useEffect } from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { bicoService, frentistaService } from '../../../services/api';
import { supabase } from '../../../services/supabase';
import { isSuccess } from '../../../types/ui/response-types';

/**
 * Retorno do hook useCarregamentoDados
 */
interface RetornoCarregamentoDados {
  bicos: BicoComDetalhes[];
  frentistas: Frentista[];
  carregando: boolean;
  erro: string | null;
  carregarDados: () => Promise<void>;
  updateBicoPrice: (bicoId: number, newPrice: number) => void;
}

/**
 * Hook customizado para carregamento de dados do fechamento
 *
 * @param postoId - ID do posto ativo
 * @returns Dados carregados e funções de controle
 *
 * @remarks
 * - Carrega bicos e frentistas em paralelo
 * - Configura realtime subscription para atualizações
 *
 * @example
 * const { bicos, frentistas, carregarDados } = useCarregamentoDados(postoId);
 */
export const useCarregamentoDados = (
  postoId: number | null
): RetornoCarregamentoDados => {
  const [bicos, setBicos] = useState<BicoComDetalhes[]>([]);
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Atualiza o preço de um bico localmente (apenas na memória da tela)
   * 
   * @param bicoId - ID do bico a ser atualizado
   * @param newPrice - Novo preço a ser aplicado
   */
  const updateBicoPrice = useCallback((bicoId: number, newPrice: number) => {
    setBicos(prev => prev.map(bico => {
      if (bico.id === bicoId) {
        return {
          ...bico,
          combustivel: {
            ...bico.combustivel,
            preco_venda: newPrice
          }
        };
      }
      return bico;
    }));
  }, []);

  /**
   * Carrega todos os dados necessários do posto
   */
  const carregarDados = useCallback(async () => {
    if (!postoId) return;

    setCarregando(true);
    setErro(null);

    try {
      // Carrega em paralelo para melhor performance
      // [18/01 00:00] Checar success e extrair data do ApiResponse
      // Motivo: services agora retornam ApiResponse
      const [dadosBicosRes, dadosFrentistasRes] = await Promise.all([
        bicoService.getWithDetails(postoId),
        frentistaService.getAll(postoId)
      ]);

      const erros: string[] = [];
      if (!isSuccess(dadosBicosRes)) {
        erros.push(dadosBicosRes.error);
        setBicos([]);
      } else {
        setBicos(dadosBicosRes.data);
      }

      if (!isSuccess(dadosFrentistasRes)) {
        erros.push(dadosFrentistasRes.error);
        setFrentistas([]);
      } else {
        setFrentistas(dadosFrentistasRes.data);
      }

      if (erros.length > 0) {
        setErro(erros[0]);
        console.error('❌ Erro ao carregar dados do posto:', erros.join(' | '));
        return;
      }

      console.log('✅ Dados carregados com sucesso');
    } catch (err) {
      const mensagemErro = 'Erro ao carregar dados do posto';
      setErro(mensagemErro);
      console.error('❌', mensagemErro, err);
    } finally {
      setCarregando(false);
    }
  }, [postoId]);

  /**
   * Configura realtime subscription para mudanças no banco
   *
   * @remarks
   * Escuta mudanças na tabela de fechamentos e recarrega
   * dados automaticamente quando necessário
   */
  useEffect(() => {
    if (!postoId) return;

    const canal = supabase
      .channel(`fechamento-${postoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Fechamento',
          filter: `posto_id=eq.${postoId}`
        },
        () => {
          console.log('🔄 Detectada mudança no banco, recarregando...');
          carregarDados();
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      canal.unsubscribe();
    };
  }, [postoId, carregarDados]);

  return {
    bicos,
    frentistas,
    carregando,
    erro,
    carregarDados,
    updateBicoPrice
  };
};
