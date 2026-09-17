import { supabase } from '../supabase';
import type { VendaProduto as VendaProdutoBase, Produto } from '../../types/database/aliases';
import type { WithRelations } from '../../types/ui/helpers';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 16:10] VendaProduto alinhado com tipos do Supabase e relacionamento Produto
export type VendaProduto = WithRelations<
  VendaProdutoBase,
  {
    Produto?: Pick<Produto, 'nome'>;
  }
>;

/**
 * Serviço de Venda de Produtos
 * 
 * @remarks
 * Gerencia vendas de produtos diversos (óleo, aditivos, etc) por frentista
 */
export const vendaProdutoService = {
  /**
   * Busca vendas de produtos por frentista e data
   * @param frentistaId - ID do frentista
   * @param date - Data no formato YYYY-MM-DD
   */
  async getByFrentistaAndDate(frentistaId: number, date: string): Promise<ApiResponse<VendaProduto[]>> {
    try {
      const { data, error } = await supabase
        .from('VendaProduto')
        .select('*, Produto(nome)')
        .eq('frentista_id', frentistaId)
        .eq('data', date);

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse((data || []) as VendaProduto[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

