import { supabase } from '../supabase';
import { Database } from '../../types/database/index';
import { estoqueService } from './estoque.service';

type Compra = Database['public']['Tables']['Compra']['Row'];
type CompraInsert = Database['public']['Tables']['Compra']['Insert'];
type Combustivel = Database['public']['Tables']['Combustivel']['Row'];
type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

/**
 * Serviço para gerenciamento de Compras de Combustível.
 */
export const compraService = {
  /**
   * Busca todas as compras.
   * @param postoId ID do posto para filtrar (opcional)
   * @param startDate Data inicial para filtro (opcional)
   * @returns Lista de compras com dados de combustível e fornecedor
   */
  async getAll(postoId?: number, startDate?: string): Promise<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]> {
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
    if (error) throw error;
    // Tipagem: assumindo que o retorno do join bate com o tipo esperado
    return (data || []) as (Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[];
  },

  /**
   * Busca compras por intervalo de datas.
   * @param startDate Data inicial (YYYY-MM-DD)
   * @param endDate Data final (YYYY-MM-DD)
   * @param postoId ID do posto (opcional)
   * @returns Lista de compras do período
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]> {
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
    if (error) throw error;
    return (data || []) as (Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[];
  },

  /**
   * Cria uma nova compra e atualiza o estoque (custo médio).
   * @param compra Dados da compra
   * @returns Compra criada
   */
  async create(compra: CompraInsert): Promise<Compra> {
    // Calcula custo por litro se não fornecido ou se necessário
    // O código original calcula:
    const custo_por_litro = compra.valor_total / compra.quantidade_litros;

    const { data, error } = await supabase
      .from('Compra')
      .insert({
        ...compra,
        custo_por_litro,
      })
      .select()
      .single();
    if (error) throw error;

    // Atualiza estoque
    if (compra.combustivel_id) {
        const estoque = await estoqueService.getByCombustivel(compra.combustivel_id);
        if (estoque) {
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

    return data;
  },
};
