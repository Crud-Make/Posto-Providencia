import { supabase } from '../supabase';
import type { Compra as CompraRow, Combustivel, Fornecedor, InsertTables } from '../../types/database/index';
import { estoqueService } from './estoque.service';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 19:05] Alinhando tipos de Compra com aliases e helpers
type Compra = CompraRow;
type CompraInsert = InsertTables<'Compra'>;

/**
 * Serviço de Compras de Combustível
 * 
 * @remarks
 * Gerencia compras de combustível e atualização automática de estoque e custo médio
 */
export const compraService = {
  /**
   * Busca todas as compras com dados de combustível e fornecedor
   * @param postoId - ID do posto (opcional)
   * @param startDate - Data inicial para filtro (opcional)
   */
  async getAll(postoId?: number, startDate?: string): Promise<ApiResponse<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]>> {
    try {
      let query = supabase
        .from('Compra')
        .select(`
          *,
          combustivel:Combustivel(*),
          fornecedor:Fornecedor(*)
        `);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      if (startDate) {
        query = query.gte('data', startDate);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca compras por intervalo de datas
   * @param startDate - Data inicial (YYYY-MM-DD)
   * @param endDate - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<ApiResponse<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]>> {
    try {
      let query = supabase
        .from('Compra')
        .select(`
          *,
          combustivel:Combustivel(*),
          fornecedor:Fornecedor(*)
        `)
        .gte('data', startDate)
        .lte('data', endDate);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova compra e atualiza o estoque automaticamente
   * @param compra - Dados da compra
   * @remarks Calcula custo por litro e atualiza custo médio ponderado do estoque
   */
  async create(compra: CompraInsert): Promise<ApiResponse<Compra>> {
    try {
      // Calcula custo por litro
      const custo_por_litro = compra.valor_total / compra.quantidade_litros;

      const { data, error } = await supabase
        .from('Compra')
        .insert({
          ...compra,
          custo_por_litro,
        })
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      // Atualiza estoque
      if (compra.combustivel_id) {
        const estoqueResponse = await estoqueService.getByCombustivel(compra.combustivel_id);

        if (estoqueResponse.success && estoqueResponse.data) {
          const estoque = estoqueResponse.data;
          const estoqueAtual = estoque.quantidade_atual;
          const custoMedioAtual = estoque.custo_medio || 0;
          const novaQuantidade = compra.quantidade_litros;
          const novoCusto = custo_por_litro;

          // Calcula novo custo médio ponderado
          const totalValorAntigo = estoqueAtual * custoMedioAtual;
          const totalValorNovo = totalValorAntigo + (novaQuantidade * novoCusto);
          const quantidadeTotal = estoqueAtual + novaQuantidade;
          const novoCustoMedio = quantidadeTotal > 0 ? totalValorNovo / quantidadeTotal : novoCusto;

          await estoqueService.update(estoque.id, {
            quantidade_atual: quantidadeTotal,
            custo_medio: novoCustoMedio,
          });
        }
      }

      return createSuccessResponse(data as Compra);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

