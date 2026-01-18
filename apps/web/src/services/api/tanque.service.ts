import { supabase } from '../supabase';
import type { Tanque as TanqueRow, HistoricoTanque, InsertTables, UpdateTables } from '../../types/database/index';
import {
    ApiResponse,
    createSuccessResponse,
    createErrorResponse
} from '../../types/ui/response-types';

// [14/01 19:05] Alinhando tipos de Tanque e histórico com aliases/helpers
export type Tanque = TanqueRow & {
    combustivel?: {
        nome: string;
        codigo: string;
        preco_venda: number;
        preco_custo: number;
    };
};
type InsertTanque = InsertTables<'Tanque'>;
type UpdateTanque = UpdateTables<'Tanque'>;

/**
 * Serviço de Tanques
 * 
 * @remarks
 * Gerencia tanques de armazenamento de combustível e seu histórico de volume
 */
export const tanqueService = {
    /**
     * Lista todos os tanques ativos com dados do combustível
     * @param postoId - ID do posto (opcional)
     */
    async getAll(postoId?: number): Promise<ApiResponse<Tanque[]>> {
        try {
            let query = supabase
                .from('Tanque')
                .select('*, combustivel:Combustivel(nome, codigo, preco_venda, preco_custo)')
                .eq('ativo', true)
                .order('nome');

            if (postoId) query = query.eq('posto_id', postoId);

            const { data, error } = await query;
            if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

            return createSuccessResponse(data as Tanque[]);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Busca um tanque por ID
     * @param id - ID do tanque
     */
    async getById(id: number): Promise<ApiResponse<TanqueRow>> {
        try {
            const { data, error } = await supabase
                .from('Tanque')
                .select('*')
                .eq('id', id)
                .single();

            if (error) return createErrorResponse(error.message, 'NOT_FOUND');
            return createSuccessResponse(data as TanqueRow);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Cria um novo tanque
     * @param tanque - Dados do tanque
     */
    async create(tanque: InsertTanque): Promise<ApiResponse<TanqueRow>> {
        try {
            const { data, error } = await supabase
                .from('Tanque')
                .insert(tanque)
                .select()
                .single();

            if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
            return createSuccessResponse(data as TanqueRow);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Atualiza um tanque existente
     * @param id - ID do tanque
     * @param tanque - Dados a serem atualizados
     */
    async update(id: number, tanque: UpdateTanque): Promise<ApiResponse<TanqueRow>> {
        try {
            const { data, error } = await supabase
                .from('Tanque')
                .update(tanque)
                .eq('id', id)
                .select()
                .single();

            if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
            return createSuccessResponse(data as TanqueRow);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Atualiza estoque de um tanque
     * @param id - ID do tanque
     * @param delta - Variação de volume (positivo = entrada, negativo = saída)
     */
    async updateStock(id: number, delta: number): Promise<ApiResponse<TanqueRow>> {
        try {
            // 1. Get current stock
            const { data: current, error: fetchError } = await supabase
                .from('Tanque')
                .select('estoque_atual')
                .eq('id', id)
                .single();

            if (fetchError) return createErrorResponse(fetchError.message, 'FETCH_ERROR');

            // 2. Calculate new stock
            const newStock = (current.estoque_atual || 0) + delta;

            // 3. Update
            const { data, error } = await supabase
                .from('Tanque')
                .update({ estoque_atual: newStock })
                .eq('id', id)
                .select()
                .single();

            if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
            return createSuccessResponse(data as TanqueRow);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Desativa um tanque (Soft Delete)
     * @param id - ID do tanque
     */
    async delete(id: number): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('Tanque')
                .update({ ativo: false })
                .eq('id', id);

            if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
            return createSuccessResponse(true);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Busca histórico de volume de um tanque
     * @param tanqueId - ID do tanque
     * @param days - Número de dias (padrão: 30)
     */
    async getHistory(tanqueId: number, days = 30): Promise<ApiResponse<HistoricoTanque[]>> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('HistoricoTanque')
                .select('*')
                .eq('tanque_id', tanqueId)
                .gte('data', startDate.toISOString().split('T')[0])
                .order('data', { ascending: true });

            if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
            return createSuccessResponse(data as HistoricoTanque[]);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Salva histórico de volume (upsert)
     * @param payload - Dados do histórico
     */
    async saveHistory(payload: { tanque_id: number; data: string; volume_livro?: number; volume_fisico?: number }): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabase
                .from('HistoricoTanque')
                .upsert(payload, { onConflict: 'tanque_id, data' });

            if (error) return createErrorResponse(error.message, 'UPSERT_ERROR');
            return createSuccessResponse(undefined);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    }
};

