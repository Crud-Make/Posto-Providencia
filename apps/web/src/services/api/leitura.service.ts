/**
 * Serviço de Leituras de Encerrante
 *
 * @remarks
 * Gerencia leituras de bombas, cálculos de vendas e atualização automática de estoque
 */

import { supabase, withPostoFilter } from './base.ts';
import { estoqueService } from './estoque.service';
import type { Leitura, Bico, Combustivel, Bomba, InsertTables, UpdateTables } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
  isSuccess
} from '../../types/ui/response-types';

export interface VendaPorCombustivel {
  combustivel: Combustivel;
  litros: number;
  valor: number;
}

export interface SalesSummary {
  data: string;
  totalLitros: number;
  totalVendas: number;
  porCombustivel: VendaPorCombustivel[];
  leituras: (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
}

export const leituraService = {
  /**
   * Busca todas as leituras de uma data específica
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   */
  async getByDate(data: string, postoId?: number): Promise<ApiResponse<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]>> {
    try {
      console.log('🔍 [leituraService.getByDate] Parâmetros:', {
        data,
        postoId,
        dataInicio: `${data}T00:00:00`,
        dataFim: `${data}T23:59:59`
      });

      const baseQuery = supabase
        .from('Leitura')
        .select(`
          *,
          bico:Bico(
            *,
            combustivel:Combustivel(*),
            bomba:Bomba(*)
          )
        `)
        .eq('data', data);

      const query = withPostoFilter(baseQuery, postoId);

      const { data: leituras, error } = await query.order('id');

      console.log('📊 [leituraService.getByDate] Resultado:', {
        totalLeituras: leituras?.length || 0,
        error: error?.message,
        primeiraLeitura: leituras?.[0]
      });

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((leituras || []) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]);
    } catch (err) {
      console.error('❌ [leituraService.getByDate] Exceção:', err);
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca leituras em um intervalo de datas
   * @param startDate - Data inicial (YYYY-MM-DD)
   * @param endDate - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<ApiResponse<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]>> {
    try {
      const baseQuery = supabase
        .from('Leitura')
        .select(`
          *,
          bico:Bico(
            *,
            combustivel:Combustivel(*),
            bomba:Bomba(*)
          )
        `)
        .gte('data', startDate)
        .lte('data', endDate);

      const query = withPostoFilter(baseQuery, postoId);

      const { data: leituras, error } = await query.order('data', { ascending: true });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((leituras || []) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca leituras de uma data e turno específicos
   * @param data - Data no formato YYYY-MM-DD
   * @param turnoId - ID do turno
   * @param postoId - ID do posto (opcional)
   */
  async getByDateAndTurno(data: string, turnoId: number, postoId?: number): Promise<ApiResponse<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]>> {
    try {
      const baseQuery = supabase
        .from('Leitura')
        .select(`
          *,
          bico:Bico(
            *,
            combustivel:Combustivel(*),
            bomba:Bomba(*)
          )
        `)
        .eq('data', data)
        .eq('turno_id', turnoId);

      const query = withPostoFilter(baseQuery, postoId);

      const { data: leituras, error } = await query.order('id');

      if (error) {
        return createErrorResponse(error.message, 'FETCH_ERROR');
      }

      return createSuccessResponse((leituras as unknown as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]) || []);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca a última leitura de cada bico
   * @param postoId - ID do posto (opcional)
   * @remarks Busca as últimas 200 leituras e filtra a mais recente por bico
   */
  async getLastReading(postoId?: number): Promise<ApiResponse<Leitura[]>> {
    try {
      const baseQuery = supabase
        .from('Leitura')
        .select('*')
        .order('data', { ascending: false })
        .order('id', { ascending: false })
        .limit(200);

      const query = withPostoFilter(baseQuery, postoId);

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // Filtra apenas a última de cada bico
      const ultimasPorBico = new Map<number, Leitura>();
      if (data) {
        data.forEach((l: Leitura) => {
          if (!ultimasPorBico.has(l.bico_id)) {
            ultimasPorBico.set(l.bico_id, l);
          }
        });
      }

      return createSuccessResponse(Array.from(ultimasPorBico.values()));
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca a última leitura de um bico específico
   * @param bicoId - ID do bico
   */
  async getLastReadingByBico(bicoId: number): Promise<ApiResponse<Leitura | null>> {
    try {
      const { data, error } = await supabase
        .from('Leitura')
        .select('*')
        .eq('bico_id', bicoId)
        .order('data', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data as Leitura | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova leitura e atualiza o estoque automaticamente
   * @param leitura - Dados da leitura
   * @remarks Calcula automaticamente litros vendidos e valor total
   */
  async create(leitura: InsertTables<'Leitura'>): Promise<ApiResponse<Leitura>> {
    try {
      // Calcula litros vendidos e valor venda
      const litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
      const valor_total = litros_vendidos * leitura.preco_litro;

      const { data, error } = await supabase
        .from('Leitura')
        .insert({
          ...leitura,
          litros_vendidos,
          valor_total,
        })
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      // Atualiza estoque
      const { data: bico } = await supabase
        .from('Bico')
        .select('combustivel_id')
        .eq('id', leitura.bico_id)
        .single();

      if (bico) {
        const estoqueResponse = await estoqueService.getByCombustivel(bico.combustivel_id);
        if (estoqueResponse.success && estoqueResponse.data) {
          const estoque = estoqueResponse.data;
          await estoqueService.update(estoque.id, {
            quantidade_atual: estoque.quantidade_atual - litros_vendidos,
          });
        }
      }

      return createSuccessResponse(data as Leitura);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma leitura existente
   * @param id - ID da leitura
   * @param leitura - Dados a serem atualizados
   * @remarks Recalcula automaticamente os valores se os campos alterarem
   */
  async update(id: number, leitura: UpdateTables<'Leitura'>): Promise<ApiResponse<Leitura>> {
    try {
      // Recalcula se necessário
      let updates = { ...leitura };
      if (leitura.leitura_final !== undefined && leitura.leitura_inicial !== undefined && leitura.preco_litro !== undefined) {
        updates.litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
        updates.valor_total = updates.litros_vendidos * leitura.preco_litro;
      }

      const { data, error } = await supabase
        .from('Leitura')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Leitura);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria múltiplas leituras de uma vez
   * @param leituras - Array de leituras a serem criadas
   * @remarks Atualiza o estoque de todos os combustíveis envolvidos
   */
  async bulkCreate(leituras: Omit<InsertTables<'Leitura'>, 'litros_vendidos' | 'valor_total'>[]): Promise<ApiResponse<Leitura[]>> {
    try {
      const leiturasWithCalc = leituras.map(l => ({
        ...l,
        litros_vendidos: l.leitura_final - l.leitura_inicial,
        valor_total: (l.leitura_final - l.leitura_inicial) * l.preco_litro,
      }));

      const { data, error } = await supabase
        .from('Leitura')
        .insert(leiturasWithCalc)
        .select();

      if (error) return createErrorResponse(error.message, 'BULK_INSERT_ERROR');

      // [29/01 13:45] Atualiza estoque para todas as leituras (com tratamento de erro)
      try {
        const bicosIds = Array.from(new Set(leituras.map(l => l.bico_id)));

        const { data: bicosData } = await supabase
          .from('Bico')
          .select('id, combustivel_id')
          .in('id', bicosIds);

        if (bicosData) {
          const bicoToCombustivel = Object.fromEntries(
            bicosData.map(b => [b.id, b.combustivel_id])
          );

          // Agrupa litros vendidos por combustível
          const vendasPorCombustivel: Record<number, number> = {};
          leiturasWithCalc.forEach(l => {
            const combId = bicoToCombustivel[l.bico_id];
            if (combId) {
              vendasPorCombustivel[combId] = (vendasPorCombustivel[combId] || 0) + l.litros_vendidos;
            }
          });

          // Atualiza o estoque de cada combustível
          for (const [combId, totalLitros] of Object.entries(vendasPorCombustivel)) {
            try {
              const estoqueResponse = await estoqueService.getByCombustivel(Number(combId));
              if (estoqueResponse.success && estoqueResponse.data) {
                const estoque = estoqueResponse.data;

                // [29/01 13:55] Use direct update without select to avoid 406 Not Acceptable
                const { error: updateError } = await supabase
                  .from('Estoque')
                  .update({
                    quantidade_atual: estoque.quantidade_atual - totalLitros,
                    ultima_atualizacao: new Date().toISOString(),
                  })
                  .eq('id', estoque.id);

                if (updateError) {
                  console.warn('[29/01 13:45] Erro ao atualizar estoque do combustível', combId, updateError);
                }
              }
            } catch (estoqueErr) {
              console.warn('[29/01 13:45] Erro ao processar estoque do combustível', combId, ':', estoqueErr);
              // Continua mesmo se falhar
            }
          }
        }
      } catch (estoqueError) {
        // [29/01 13:45] Não impede o salvamento das leituras se o estoque falhar
        console.warn('[29/01 13:45] Erro ao atualizar estoque (não crítico):', estoqueError);
      }

      return createSuccessResponse(data as Leitura[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove todas as leituras de uma data específica
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto
   * @remarks Considera apenas turno_id = 1
   */
  async deleteByDate(data: string, postoId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Leitura')
        .delete()
        .eq('data', data)
        .eq('turno_id', 1)
        .eq('posto_id', postoId);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove todas as leituras de uma data e turno específicos
   * @param data - Data no formato YYYY-MM-DD
   * @param turnoId - ID do turno
   * @param postoId - ID do posto
   */
  async deleteByShift(data: string, turnoId: number, postoId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Leitura')
        .delete()
        .eq('data', data)
        .eq('turno_id', turnoId)
        .eq('posto_id', postoId);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Gera resumo consolidado de vendas por data
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   */
  async getSalesSummaryByDate(data: string, postoId?: number): Promise<ApiResponse<SalesSummary>> {
    try {
      const leiturasResponse = await this.getByDate(data, postoId);

      if (!leiturasResponse.success) {
        return createErrorResponse(leiturasResponse.error, leiturasResponse.code);
      }

      const leituras = leiturasResponse.data;
      const totalLitros = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
      const totalVendas = leituras.reduce((acc, l) => acc + (l.valor_total || 0), 0);

      // Agrupa por combustível
      const porCombustivel = leituras.reduce((acc, l) => {
        const codigo = l.bico.combustivel.codigo;
        if (!acc[codigo]) {
          acc[codigo] = {
            combustivel: l.bico.combustivel,
            litros: 0,
            valor: 0,
          };
        }
        acc[codigo].litros += l.litros_vendidos || 0;
        acc[codigo].valor += l.valor_total || 0;
        return acc;
      }, {} as Record<string, { combustivel: Combustivel; litros: number; valor: number }>);

      return createSuccessResponse({
        data,
        totalLitros,
        totalVendas,
        porCombustivel: Object.values(porCombustivel),
        leituras,
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

