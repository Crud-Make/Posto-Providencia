/**
 * Serviço de Combustíveis
 *
 * @remarks
 * Gerencia operações CRUD de combustíveis do posto (Gasolina, Etanol, Diesel, etc)
 */

import { supabase, withPostoFilter } from './base';
import type { Combustivel, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/** Ordem de exibição padrão dos combustíveis */
const ORDEM_COMBUSTIVEIS = ['GC', 'GA', 'ET', 'S10', 'DIESEL'] as const;

export const combustivelService = {
  /** Ordem customizada dos combustíveis */
  ORDEM_COMBUSTIVEIS,

  /**
   * Busca todos os combustíveis ativos
   * @param postoId - Filtro opcional por posto
   * @remarks Retorna ordenado pela ordem customizada (GC, GA, ET, S10, DIESEL)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Combustivel[]>> {
    try {
      const baseQuery = supabase
        .from('Combustivel')
        .select('*')
        .eq('ativo', true);

      const query = withPostoFilter(baseQuery, postoId);
      const { data, error } = await query;

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // Ordena por ordem customizada
      const ordem = ORDEM_COMBUSTIVEIS;
      const sorted = (data || []).sort((a, b) => {
        const indexA = ordem.indexOf(a.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
        const indexB = ordem.indexOf(b.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;
        return posA - posB;
      });

      return createSuccessResponse(sorted as Combustivel[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca um combustível por ID
   * @param id - ID do combustível
   */
  async getById(id: number): Promise<ApiResponse<Combustivel | null>> {
    try {
      const { data, error } = await supabase
        .from('Combustivel')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as Combustivel | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo combustível
   * @param combustivel - Dados do combustível
   */
  async create(combustivel: InsertTables<'Combustivel'>): Promise<ApiResponse<Combustivel>> {
    try {
      const { data, error } = await supabase
        .from('Combustivel')
        .insert(combustivel)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Combustivel);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um combustível existente
   * @param id - ID do combustível
   * @param combustivel - Dados a serem atualizados
   */
  async update(id: number, combustivel: UpdateTables<'Combustivel'>): Promise<ApiResponse<Combustivel>> {
    try {
      const { data, error } = await supabase
        .from('Combustivel')
        .update(combustivel)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Combustivel);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

