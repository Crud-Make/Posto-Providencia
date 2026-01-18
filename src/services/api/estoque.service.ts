/**
 * Serviço de Estoque
 *
 * @remarks
 * Gerencia operações de estoque, previsão de abastecimento e monitoramento de níveis
 */

import { supabase, withPostoFilter } from './base';
import type { Estoque, Combustivel, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const estoqueService = {
  /**
   * Lista todos os estoques com informações do combustível
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<(Estoque & { combustivel: Combustivel })[]>> {
    try {
      const baseQuery = supabase
        .from('Estoque')
        .select(`
          *,
          combustivel:Combustivel(*)
        `);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Estoque & { combustivel: Combustivel })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca estoque de um combustível específico
   * @param combustivelId - ID do combustível
   */
  async getByCombustivel(combustivelId: number): Promise<ApiResponse<Estoque | null>> {
    try {
      const { data, error } = await supabase
        .from('Estoque')
        .select('*')
        .eq('combustivel_id', combustivelId)
        .maybeSingle();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as Estoque | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza dados do estoque
   * @param id - ID do estoque
   * @param estoque - Dados a serem atualizados
   * @remarks Atualiza automaticamente o campo ultima_atualizacao
   */
  async update(id: number, estoque: UpdateTables<'Estoque'>): Promise<ApiResponse<Estoque>> {
    try {
      const { data, error } = await supabase
        .from('Estoque')
        .update({
          ...estoque,
          ultima_atualizacao: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Estoque);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Calcula previsão de dias restantes de estoque
   * @param combustivelId - ID do combustível
   * @param diasAnalise - Número de dias para calcular a média (padrão: 7)
   */
  async getDiasRestantes(combustivelId: number, diasAnalise = 7): Promise<ApiResponse<{
    estoqueAtual: number;
    capacidade: number;
    percentual: number;
    mediaDiaria: number;
    diasRestantes: number;
  } | null>> {
    try {
      const estoqueResponse = await this.getByCombustivel(combustivelId);

      if (!estoqueResponse.success || !estoqueResponse.data) {
        return createSuccessResponse(null);
      }

      const estoque = estoqueResponse.data;

      // Busca leituras dos últimos X dias
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - diasAnalise);

      const { data: leituras, error } = await supabase
        .from('Leitura')
        .select(`
          litros_vendidos,
          bico:Bico!inner(combustivel_id)
        `)
        .eq('bico.combustivel_id', combustivelId)
        .gte('data', dataInicio.toISOString().split('T')[0]);

      if (error) return createErrorResponse(error.message, 'ANALYSIS_ERROR');

      const totalVendido = leituras?.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0) || 0;
      const mediadiaria = totalVendido / diasAnalise;

      return createSuccessResponse({
        estoqueAtual: estoque.quantidade_atual,
        capacidade: estoque.capacidade_tanque,
        percentual: (estoque.quantidade_atual / estoque.capacidade_tanque) * 100,
        mediaDiaria: mediadiaria,
        diasRestantes: mediadiaria > 0 ? Math.floor(estoque.quantidade_atual / mediadiaria) : 999,
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

