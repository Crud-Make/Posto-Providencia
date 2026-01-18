import { supabase } from '../supabase';
import type { ClienteTable } from '../../types/database/tables/clientes';
import type { FrentistaTable } from '../../types/database/tables/operacoes';
import type { WithRelations } from '../../types/ui/helpers';
import type { Cliente, NotaFrentista } from '../../types/ui/smart-types';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [18/01 10:05] Upgrade para ApiResponse compatível com Smart Types Fase 2

// Tipos com relacionamentos
export type NotaFrentistaComFrentista = WithRelations<
  NotaFrentista,
  { frentista?: Pick<FrentistaTable['Row'], 'id' | 'nome'> }
>;

export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;

export type ClienteCompleto = WithRelations<
  Cliente,
  { notas?: NotaFrentistaComFrentista[] }
>;

/**
 * Serviço para gestão de Clientes e Notas de Fiado (Venda a Prazo)
 */
export const clienteService = {
  /**
   * Busca todos os clientes ativos
   * @param postoId - ID opcional do posto para filtrar
   */
  async getAll(postoId?: number): Promise<ApiResponse<Cliente[]>> {
    try {
      let query = supabase
        .from('Cliente')
        .select('*')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Cliente[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca todos os clientes com o resumo de suas notas (saldo)
   * @param postoId - ID opcional do posto
   */
  async getAllWithSaldo(postoId?: number): Promise<ApiResponse<ClienteComNotas[]>> {
    try {
      let query = supabase
        .from('Cliente')
        .select(`
          *,
          notas:NotaFrentista(id, valor, status, data)
        `)
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // Necessário cast para ClienteComNotas pois selecionamos apenas campos parciais de notas
      return createSuccessResponse(data as unknown as ClienteComNotas[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca um cliente pelo ID com detalhes completos das notas
   * @param id - ID do cliente
   */
  async getById(id: number): Promise<ApiResponse<ClienteCompleto | null>> {
    try {
      const { data, error } = await supabase
        .from('Cliente')
        .select(`
          *,
          notas:NotaFrentista(
            *,
            frentista:Frentista(id, nome)
          )
        `)
        .eq('id', id)
        .single();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as unknown as ClienteCompleto);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista apenas clientes com saldo devedor positivo
   * @param postoId - ID do posto
   */
  async getDevedores(postoId?: number): Promise<ApiResponse<Cliente[]>> {
    try {
      let query = supabase
        .from('Cliente')
        .select('*')
        .eq('ativo', true)
        .gt('saldo_devedor', 0);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('saldo_devedor', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Cliente[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo cliente
   * @param cliente - Dados do cliente para inserção
   */
  async create(cliente: ClienteTable['Insert']): Promise<ApiResponse<Cliente>> {
    try {
      const { data, error } = await supabase
        .from('Cliente')
        .insert(cliente)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Cliente);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza dados de um cliente existente
   * @param id - ID do cliente
   * @param updates - Campos a serem atualizados
   */
  async update(id: number, updates: ClienteTable['Update']): Promise<ApiResponse<Cliente>> {
    try {
      const { data, error } = await supabase
        .from('Cliente')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Cliente);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Desativa um cliente (Soft Delete)
   * @param id - ID do cliente
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Cliente')
        .update({ ativo: false })
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Pesquisa clientes por nome, documento ou telefone
   * @param termo - Termo de busca
   * @param postoId - ID do posto para filtro
   */
  async search(termo: string, postoId?: number): Promise<ApiResponse<Cliente[]>> {
    try {
      let query = supabase
        .from('Cliente')
        .select('*')
        .eq('ativo', true)
        .or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%,telefone.ilike.%${termo}%`);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome').limit(20);
      if (error) return createErrorResponse(error.message, 'SEARCH_ERROR');

      return createSuccessResponse(data as Cliente[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};


