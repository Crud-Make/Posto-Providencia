import { supabase } from '../supabase';
import type { Fornecedor as FornecedorRow, InsertTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';
import { corteDaTelaLigado, descreverErroDaApi } from './base';
import { lerFornecedoresDaApi } from './fornecedor.api';

// [14/01 19:05] Alinhando tipos de Fornecedor com aliases e helpers
type Fornecedor = FornecedorRow;
type FornecedorInsert = InsertTables<'Fornecedor'>;

/**
 * Serviço de Fornecedores
 * 
 * @remarks
 * Gerencia fornecedores de combustível para compras
 */
export const fornecedorService = {
  /**
   * Lista todos os fornecedores ativos
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<Fornecedor[]>> {
    // Primeira leitura do painel pela API Laravel (#103). Só quando o corte desta tela está ligado
    // e há posto: a rota é por posto, e sem posto a query antiga lia todos — isso fica no Supabase.
    // `VITE_API_FORNECEDOR=0` deixa esta tela no Supabase mesmo com o `VITE_API_URL` ligado.
    if (corteDaTelaLigado(import.meta.env.VITE_API_FORNECEDOR) && postoId !== undefined) {
      return lerFornecedoresDaApi(postoId).match(
        (fornecedores) => createSuccessResponse(fornecedores),
        (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR'),
      );
    }

    try {
      let query = supabase
        .from('Fornecedor')
        .select('*')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('nome');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data as Fornecedor[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo fornecedor
   * @param fornecedor - Dados do fornecedor
   */
  async create(fornecedor: FornecedorInsert): Promise<ApiResponse<Fornecedor>> {
    try {
      const { data, error } = await supabase
        .from('Fornecedor')
        .insert(fornecedor)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Fornecedor);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

