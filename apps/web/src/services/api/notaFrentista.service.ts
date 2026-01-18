import { supabase } from '../supabase';
import type { NotaFrentistaTable } from '../../types/database/tables/clientes';
import type { WithRelations } from '../../types/ui/helpers';
import type {
  NotaFrentista as NotaFrentistaDomain,
  Cliente as ClienteDomain,
  Frentista as FrentistaDomain
} from '@posto/types';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 10:30] Refatoração para usar tipos do Supabase e WithRelations
export type NotaFrentista = NotaFrentistaDomain;
export type Cliente = ClienteDomain;
export type Frentista = FrentistaDomain;

export type NotaFrentistaResponse = WithRelations<
  NotaFrentista,
  {
    cliente?: Partial<Cliente>;
    frentista?: Partial<Frentista>;
  }
>;

export interface ResumoFiado {
  totalPendente: number;
  totalClientes: number;
  notasPendentes: number;
  maiorDevedor: { nome: string; valor: number } | null;
}

/**
 * Serviço de Notas de Frentista (Fiado)
 * 
 * @remarks
 * Gerencia notas de fiado com clientes, incluindo registro, pagamento e resumos
 */
export const notaFrentistaService = {
  /**
   * Lista todas as notas de frentista
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<NotaFrentistaResponse[]>> {
    try {
      let query = supabase
        .from('NotaFrentista')
        .select(`
          *,
          cliente:Cliente(id, nome, documento),
          frentista:Frentista(id, nome)
        `);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as NotaFrentistaResponse[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lista notas pendentes de pagamento
   * @param postoId - ID do posto (opcional)
   */
  async getPendentes(postoId?: number): Promise<ApiResponse<NotaFrentistaResponse[]>> {
    try {
      let query = supabase
        .from('NotaFrentista')
        .select(`
          *,
          cliente:Cliente(id, nome, documento, telefone),
          frentista:Frentista(id, nome)
        `)
        .eq('status', 'pendente');

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as NotaFrentistaResponse[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca notas por cliente
   * @param clienteId - ID do cliente
   */
  async getByCliente(clienteId: number): Promise<ApiResponse<NotaFrentistaResponse[]>> {
    try {
      const { data, error } = await supabase
        .from('NotaFrentista')
        .select(`
          *,
          frentista:Frentista(id, nome)
        `)
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false });

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
      return createSuccessResponse((data || []) as NotaFrentistaResponse[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca notas por intervalo de datas
   * @param dataInicio - Data inicial (YYYY-MM-DD)
   * @param dataFim - Data final (YYYY-MM-DD)
   * @param postoId - ID do posto (opcional)
   */
  async getByDateRange(dataInicio: string, dataFim: string, postoId?: number): Promise<ApiResponse<NotaFrentistaResponse[]>> {
    try {
      let query = supabase
        .from('NotaFrentista')
        .select(`
          *,
          cliente:Cliente(id, nome),
          frentista:Frentista(id, nome)
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('data', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as NotaFrentistaResponse[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma nova nota de frentista
   * @param nota - Dados da nota
   */
  async create(nota: NotaFrentistaTable['Insert']): Promise<ApiResponse<NotaFrentistaResponse>> {
    try {
      const { data, error } = await supabase
        .from('NotaFrentista')
        .insert({
          ...nota,
          data: nota.data || new Date().toISOString().split('T')[0],
          status: nota.status || 'pendente'
        })
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
      return createSuccessResponse(data as NotaFrentistaResponse);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Registra pagamento de uma nota
   * @param id - ID da nota
   * @param formaPagamento - Forma de pagamento utilizada
   * @param observacoes - Observações do pagamento (opcional)
   * @param dataPagamento - Data do pagamento (opcional, padrão: hoje)
   */
  async registrarPagamento(id: number, formaPagamento: string, observacoes?: string, dataPagamento?: string): Promise<ApiResponse<NotaFrentistaResponse>> {
    try {
      const { data, error } = await supabase
        .from('NotaFrentista')
        .update({
          status: 'pago',
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
          forma_pagamento: formaPagamento,
          observacoes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as NotaFrentistaResponse);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cancela uma nota
   * @param id - ID da nota
   * @param observacoes - Motivo do cancelamento (opcional)
   */
  async cancelar(id: number, observacoes?: string): Promise<ApiResponse<NotaFrentistaResponse>> {
    try {
      const { data, error } = await supabase
        .from('NotaFrentista')
        .update({
          status: 'cancelado',
          observacoes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as NotaFrentistaResponse);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza uma nota
   * @param id - ID da nota
   * @param updates - Dados para atualização
   */
  async update(id: number, updates: NotaFrentistaTable['Update']): Promise<ApiResponse<NotaFrentistaResponse>> {
    try {
      const { data, error } = await supabase
        .from('NotaFrentista')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as NotaFrentistaResponse);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove uma nota
   * @param id - ID da nota
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('NotaFrentista')
        .delete()
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Obtém resumo de notas pendentes
   * @param postoId - ID do posto (opcional)
   * @remarks Inclui total pendente, quantidade de clientes e maior devedor
   */
  async getResumo(postoId?: number): Promise<ApiResponse<ResumoFiado>> {
    try {
      let query = supabase
        .from('NotaFrentista')
        .select(`
          valor,
          cliente:Cliente(id, nome)
        `)
        .eq('status', 'pendente');

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query;
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      const notas = data || [];
      type NotaComCliente = { valor: number; cliente: { id: number; nome: string } | null };
      const notasTyped = notas as NotaComCliente[];
      const totalPendente = notasTyped.reduce((acc, n) => acc + n.valor, 0);

      // Agrupa por cliente
      const porCliente: Record<string, { nome: string; valor: number }> = {};
      notasTyped.forEach((n) => {
        const clienteId = n.cliente?.id?.toString() || 'unknown';
        const clienteNome = n.cliente?.nome || 'Desconhecido';
        if (!porCliente[clienteId]) {
          porCliente[clienteId] = { nome: clienteNome, valor: 0 };
        }
        porCliente[clienteId].valor += n.valor;
      });

      const clientesUnicos = Object.keys(porCliente).length;
      const maiorDevedor = Object.values(porCliente).sort((a, b) => b.valor - a.valor)[0] || null;

      return createSuccessResponse({
        totalPendente,
        totalClientes: clientesUnicos,
        notasPendentes: notas.length,
        maiorDevedor
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

