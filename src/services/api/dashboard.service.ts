import { supabase } from '../supabase';
import { leituraService } from './leitura.service';
import { fechamentoService } from './fechamento.service';
import { estoqueService } from './estoque.service';

/**
 * Serviço para dados do Dashboard Principal.
 */
export const dashboardService = {
  /**
   * Obtém resumo do dia atual (vendas, fechamento, estoque).
   * @param postoId ID do posto (opcional)
   * @returns Objeto com resumo do dia
   */
  async getResumoHoje(postoId?: number) {
    const hoje = new Date().toISOString().split('T')[0];

    // Vendas do dia
    const vendas = await leituraService.getSalesSummaryByDate(hoje, postoId);

    // Fechamento do dia
    const fechamento = await fechamentoService.getByDate(hoje, postoId);

    // Estoque
    const estoque = await estoqueService.getAll(postoId);

    return {
      data: hoje,
      vendas,
      fechamento,
      estoque: estoque.map(e => ({
        ...e,
        percentual: (e.quantidade_atual / e.capacidade_tanque) * 100,
        status:
          (e.quantidade_atual / e.capacidade_tanque) < 0.1 ? 'CRÍTICO' :
            (e.quantidade_atual / e.capacidade_tanque) < 0.2 ? 'BAIXO' : 'OK',
      })),
    };
  },

  /**
   * Obtém vendas de um período específico para gráficos.
   * @param dataInicio Data inicial (YYYY-MM-DD)
   * @param dataFim Data final (YYYY-MM-DD)
   * @param postoId ID do posto (opcional)
   * @returns Lista de vendas (leituras) do período
   */
  async getVendasPeriodo(dataInicio: string, dataFim: string, postoId?: number) {
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
    if (error) throw error;
    return data || [];
  },
};
