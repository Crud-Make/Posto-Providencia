import { supabase } from '../supabase';
// [01/02 11:35] Corrigindo caminho de importação.
import { ApiResponse, createSuccessResponse, createErrorResponse } from '../../types/ui/response-types';

/**
 * Interface para representar uma Categoria Financeira.
 */
export interface CategoriaFinanceira {
    id: number;
    nome: string;
    tipo: 'receita' | 'despesa' | 'ambos';
    icone?: string | null;
    cor?: string | null;
    posto_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

/**
 * Serviço para gestão de categorias financeiras.
 */
export const categoriaService = {
    /**
     * Busca todas as categorias de um posto.
     * 
     * @param postoId - ID do posto (opcional)
     * @param tipo - Filtro por tipo (opcional)
     * @returns Promessa com lista de categorias filtradas
     */
    async getAll(postoId?: number, tipo?: 'receita' | 'despesa' | 'ambos'): Promise<ApiResponse<CategoriaFinanceira[]>> {
        try {
            let query = supabase
                .from('CategoriaFinanceira')
                .select('*');

            if (postoId) {
                query = query.or(`posto_id.eq.${postoId},posto_id.is.null`);
            } else {
                query = query.is('posto_id', null);
            }

            if (tipo && tipo !== 'ambos') {
                query = query.or(`tipo.eq.${tipo},tipo.eq.ambos`);
            }

            const { data, error } = await query.order('nome');

            if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
            return createSuccessResponse(data as CategoriaFinanceira[]);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Cria uma nova categoria.
     * 
     * @param categoria - Dados da categoria a inserir
     * @returns Promessa com a categoria criada
     */
    async create(categoria: Omit<CategoriaFinanceira, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CategoriaFinanceira>> {
        try {
            const { data, error } = await supabase
                .from('CategoriaFinanceira')
                .insert(categoria)
                .select()
                .single();

            if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
            return createSuccessResponse(data as CategoriaFinanceira);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    }
};
