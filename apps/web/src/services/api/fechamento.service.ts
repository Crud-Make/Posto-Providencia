import { supabase } from '../supabase';
import { Fechamento, InsertTables, UpdateTables, Recebimento, FormaPagamento, Maquininha, FechamentoFrentista, Frentista, Usuario, Turno } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/**
 * Serviço de Fechamento de Caixa
 * 
 * @remarks
 * Gerencia operações de fechamento diário, turnos e consolidação de vendas
 */
export const fechamentoService = {
  /**
   * Busca um fechamento único por data e posto
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   * @remarks Assume turno_id = 1 (padrão legado/simplificado)
   */
  async getByDateUnique(data: string, postoId?: number): Promise<ApiResponse<Fechamento | null>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select('*')
        .eq('data', data)
        .eq('turno_id', 1);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: fechamentos, error } = await query.order('id', { ascending: false }).limit(1);
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      const resultado = fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;
      return createSuccessResponse(resultado as Fechamento | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca fechamento por data e turno específico
   * @param data - Data no formato YYYY-MM-DD
   * @param turnoId - ID do turno
   * @param postoId - ID do posto (opcional)
   */
  async getByDateAndTurno(data: string, turnoId: number, postoId?: number): Promise<ApiResponse<Fechamento | null>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select('*')
        .eq('data', data)
        .eq('turno_id', turnoId);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: fechamentos, error } = await query.order('id', { ascending: false }).limit(1);
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      const resultado = fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;
      return createSuccessResponse(resultado as Fechamento | null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista todos os fechamentos de uma data com joins de turno e usuário
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   */
  async getByDate(data: string, postoId?: number): Promise<ApiResponse<(Fechamento & { turno: Turno | null; usuario: { id: string; nome: string } | null })[]>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select(`
          *,
          turno:Turno(*),
          usuario:Usuario(id, nome)
        `)
        .eq('data', data);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: fechamentos, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(fechamentos as unknown as (Fechamento & { turno: Turno | null; usuario: { id: string; nome: string } | null })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca fechamento com todos os detalhes (recebimentos, frentistas, etc)
   * @param id - ID do fechamento
   */
  async getWithDetails(id: number): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('Fechamento')
        .select(`
          *,
          recebimentos:Recebimento(
            *,
            forma_pagamento:FormaPagamento(*),
            maquininha:Maquininha(*)
          ),
          fechamentos_frentista:FechamentoFrentista(
            *,
            frentista:Frentista(*)
          ),
          usuario:Usuario(id, nome)
        `)
        .eq('id', id)
        .single();

      if (error) return createErrorResponse(error.message, 'NOT_FOUND');
      return createSuccessResponse(data);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista os fechamentos mais recentes
   * @param limit - Número máximo de registros (padrão: 10)
   * @param postoId - ID do posto (opcional)
   */
  async getRecent(limit = 10, postoId?: number): Promise<ApiResponse<Fechamento[]>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select('*');

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query
        .order('data', { ascending: false })
        .limit(limit);

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse(data as Fechamento[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo fechamento de caixa
   * @param fechamento - Dados do fechamento
   */
  async create(fechamento: Omit<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'> & Partial<Pick<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'>>): Promise<ApiResponse<Fechamento>> {
    try {
      const payload: InsertTables<'Fechamento'> = {
        ...fechamento,
        diferenca: fechamento.diferenca ?? 0,
        total_recebido: fechamento.total_recebido ?? 0,
        total_vendas: fechamento.total_vendas ?? 0,
      } as InsertTables<'Fechamento'>;

      const { data, error } = await supabase
        .from('Fechamento')
        .insert(payload)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as Fechamento);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um fechamento existente
   * @param id - ID do fechamento
   * @param fechamento - Dados a serem atualizados
   */
  async update(id: number, fechamento: UpdateTables<'Fechamento'>): Promise<ApiResponse<Fechamento>> {
    try {
      const { data, error } = await supabase
        .from('Fechamento')
        .update(fechamento)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Fechamento);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Finaliza um fechamento (muda status para FECHADO)
   * @param id - ID do fechamento
   * @param observacoes - Observações opcionais
   */
  async finalize(id: number, observacoes?: string): Promise<ApiResponse<Fechamento>> {
    return this.update(id, {
      status: 'FECHADO',
      observacoes,
    });
  },

  // [27/01 10:30] Adicionado método para buscar dados de lucro por período
  /**
   * Busca dados consolidados de lucro por período
   * @param dataInicio - Data inicial no formato YYYY-MM-DD
   * @param dataFim - Data final no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   * @returns Dados agregados de lucro, receitas e despesas
   */
  async getLucroPorPeriodo(dataInicio: string, dataFim: string, postoId?: number): Promise<ApiResponse<{
    receita_bruta: number;
    custo_combustiveis: number;
    lucro_bruto: number;
    taxas_pagamento: number;
    faltas: number;
    lucro_liquido: number;
    margem_bruta_pct: number;
    margem_liquida_pct: number;
    dias_operados: number;
  }>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select('total_vendas, custo_combustiveis, lucro_bruto, taxas_pagamento, diferenca, lucro_liquido, margem_bruta_percentual, margem_liquida_percentual')
        .gte('data', `${dataInicio}T00:00:00`)
        .lte('data', `${dataFim}T23:59:59`)
        .gt('total_vendas', 0);  // Apenas dias com movimento

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // Agregar dados
      const resultado = {
        receita_bruta: data.reduce((acc, f) => acc + Number(f.total_vendas || 0), 0),
        custo_combustiveis: data.reduce((acc, f) => acc + Number(f.custo_combustiveis || 0), 0),
        lucro_bruto: data.reduce((acc, f) => acc + Number(f.lucro_bruto || 0), 0),
        taxas_pagamento: data.reduce((acc, f) => acc + Number(f.taxas_pagamento || 0), 0),
        faltas: data.reduce((acc, f) => acc + Math.abs(Number(f.diferenca || 0)), 0),
        lucro_liquido: data.reduce((acc, f) => acc + Number(f.lucro_liquido || 0), 0),
        dias_operados: data.length,
        // Calcular margens médias ponderadas
        margem_bruta_pct: 0,
        margem_liquida_pct: 0
      };

      // Margens calculadas sobre o total (não média aritmética)
      if (resultado.receita_bruta > 0) {
        resultado.margem_bruta_pct = (resultado.lucro_bruto / resultado.receita_bruta) * 100;
        resultado.margem_liquida_pct = (resultado.lucro_liquido / resultado.receita_bruta) * 100;
      }

      return createSuccessResponse(resultado);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};
