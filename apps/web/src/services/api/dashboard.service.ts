import { supabase } from '../supabase';
import { leituraService } from './leitura.service';
import { fechamentoService } from './fechamento.service';
import { estoqueService } from './estoque.service';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/**
 * Serviço de Dashboard
 * 
 * @remarks
 * Gerencia dados consolidados para o dashboard principal
 */
export const dashboardService = {
  /**
   * Obtém resumo do dia atual (vendas, fechamento, estoque)
   * @param postoId - ID do posto (opcional)
   */
  async getResumoHoje(postoId?: number): Promise<ApiResponse<{
    data: string;
    vendas: unknown;
    fechamento: unknown;
    estoque: { percentual: number; status: string }[];
  }>> {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Vendas do dia
      const vendasResponse = await leituraService.getSalesSummaryByDate(hoje, postoId);

      // Fechamento do dia
      const fechamentoResponse = await fechamentoService.getByDate(hoje, postoId);

      // Estoque
      const estoqueResponse = await estoqueService.getAll(postoId);

      if (!estoqueResponse.success) {
        return createErrorResponse('Erro ao buscar estoque', 'FETCH_ERROR');
      }

      return createSuccessResponse({
        data: hoje,
        vendas: vendasResponse.success ? vendasResponse.data : null,
        fechamento: fechamentoResponse.success ? fechamentoResponse.data : null,
        estoque: estoqueResponse.data.map(e => ({
          ...e,
          percentual: (e.quantidade_atual / e.capacidade_tanque) * 100,
          status:
            (e.quantidade_atual / e.capacidade_tanque) < 0.1 ? 'CRÍTICO' :
              (e.quantidade_atual / e.capacidade_tanque) < 0.2 ? 'BAIXO' : 'OK',
        })),
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Obtém vendas de um período específico para gráficos
   * @param dataInicio - Data inicial (YYYY-MM-DD)
   * @param dataFim - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getVendasPeriodo(dataInicio: string, dataFim: string, postoId?: number): Promise<ApiResponse<unknown[]>> {
    try {
      let query = supabase
        .from('Leitura')
        .select(`
          data,
          litros_vendidos,
          valor_total,
          bico:Bico(
            combustivel:Combustivel(codigo, nome)
          )
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data');
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data || []);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

