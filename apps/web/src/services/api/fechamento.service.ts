import { supabase } from '../supabase';
import { Fechamento, InsertTables, UpdateTables, Recebimento, FormaPagamento, Maquininha, FechamentoFrentista, Frentista } from '../../types/database/index';
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

/** Fechamento com todas as relações trazidas por `getWithDetails`
 *  (`select: *, recebimentos:Recebimento(*, forma_pagamento:FormaPagamento(*), maquininha:Maquininha(*)),
 *  fechamentos_frentista:FechamentoFrentista(*, frentista:Frentista(*)), usuario:Usuario(id, nome)`). */
interface FechamentoComDetalhes extends Fechamento {
  recebimentos: (Recebimento & {
    forma_pagamento: FormaPagamento | null;
    maquininha: Maquininha | null;
  })[];
  fechamentos_frentista: (FechamentoFrentista & { frentista: Frentista | null })[];
  usuario: { id: string; nome: string } | null;
}
export const fechamentoService = {
  /**
   * Busca o fechamento do dia
   *
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   *
   * @remarks [16/08] Substitui `getByDateUnique` e `getByDateAndTurno`, que eram a mesma
   *          consulta a menos do filtro de turno — uma fixava `turno_id = 1` e a outra
   *          recebia o turno de fora. O posto não trabalha por turno: o fechamento é do
   *          dia, e é essa a chave. Com as duas separadas, ler pelo caminho "com turno" e
   *          gravar pelo "único" podia acertar linhas diferentes no mesmo dia.
   *
   *          Ainda ordena por `id` decrescente e pega 1: enquanto o índice de produção for
   *          `UNIQUE (data, turno_id)`, um `turno_id` nulo não colide com outro nulo, então
   *          o dia PODE ter mais de uma linha. Até a migração trocar o índice para
   *          `UNIQUE (data)`, esta ordenação é o que garante que se leia a mais recente.
   */
  async getDoDia(data: string, postoId?: number): Promise<ApiResponse<Fechamento | null>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select('*')
        .eq('data', data);

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
   * Lista todos os fechamentos de uma data com join de usuário
   * @param data - Data no formato YYYY-MM-DD
   * @param postoId - ID do posto (opcional)
   *
   * @remarks [16/08] O join `turno:Turno(*)` saiu. Deve devolver uma linha só; devolve
   *          lista porque o índice de produção ainda permite mais de uma por dia enquanto
   *          `turno_id` for nulável — ver `getDoDia`.
   */
  async getByDate(data: string, postoId?: number): Promise<ApiResponse<(Fechamento & { usuario: { id: string; nome: string } | null })[]>> {
    try {
      let query = supabase
        .from('Fechamento')
        .select(`
          *,
          usuario:Usuario(id, nome)
        `)
        .eq('data', data);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: fechamentos, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(fechamentos as unknown as (Fechamento & { usuario: { id: string; nome: string } | null })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca fechamento com todos os detalhes (recebimentos, frentistas, etc)
   * @param id - ID do fechamento
   */
  async getWithDetails(id: number): Promise<ApiResponse<FechamentoComDetalhes>> {
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
      return createSuccessResponse(data as unknown as FechamentoComDetalhes);
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
        .gte('data', `${dataInicio}T00:00:00Z`)
        .lte('data', `${dataFim}T23:59:59Z`)
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
