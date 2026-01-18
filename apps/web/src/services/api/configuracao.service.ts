/**
 * Serviço de Configurações
 *
 * @remarks
 * Gerencia configurações do sistema (chave-valor)
 */

import { supabase, withPostoFilter } from './base';
import type { Configuracao } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export const configuracaoService = {
  /**
   * Lista todas as configurações
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Configuracao[]>> {
    try {
      const baseQuery = supabase
        .from('Configuracao')
        .select('*');

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.order('categoria', { ascending: true });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as Configuracao[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca uma configuração por chave
   * @param chave - Chave da configuração
   * @param postoId - ID do posto (opcional)
   */
  async getByChave(chave: string, postoId?: number): Promise<ApiResponse<Configuracao | null>> {
    try {
      const baseQuery = supabase
        .from('Configuracao')
        .select('*')
        .eq('chave', chave);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') return createErrorResponse(error.message, 'NOT_FOUND');

      return createSuccessResponse(data as Configuracao | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca configurações por categoria
   * @param categoria - Categoria das configurações
   * @param postoId - ID do posto (opcional)
   */
  async getByCategoria(categoria: string, postoId?: number): Promise<ApiResponse<Configuracao[]>> {
    try {
      const baseQuery = supabase
        .from('Configuracao')
        .select('*')
        .eq('categoria', categoria);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as Configuracao[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma configuração
   * @param chave - Chave da configuração
   * @param valor - Novo valor
   * @param postoId - ID do posto (opcional)
   */
  async update(chave: string, valor: string, postoId?: number): Promise<ApiResponse<Configuracao>> {
    try {
      const baseQuery = supabase
        .from('Configuracao')
        .update({ valor, updated_at: new Date().toISOString() })
        .eq('chave', chave);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Configuracao);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Obtém valor numérico de uma configuração
   * @param chave - Chave da configuração
   * @param valorPadrao - Valor padrão se não encontrar
   */
  async getValorNumerico(chave: string, valorPadrao: number = 0): Promise<ApiResponse<number>> {
    try {
      const configResponse = await this.getByChave(chave);

      if (!configResponse.success || !configResponse.data) {
        return createSuccessResponse(valorPadrao);
      }

      return createSuccessResponse(parseFloat(configResponse.data.valor) || valorPadrao);
    } catch {
      return createSuccessResponse(valorPadrao);
    }
  },

  /**
   * Cria uma nova configuração
   * @param config - Dados da configuração
   */
  async create(config: Omit<Configuracao, 'id' | 'updated_at'>): Promise<ApiResponse<Configuracao>> {
    try {
      const { data, error } = await supabase
        .from('Configuracao')
        .insert(config)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Configuracao);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

