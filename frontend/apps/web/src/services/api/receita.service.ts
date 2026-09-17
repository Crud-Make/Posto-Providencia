import { supabase } from '../supabase';
// [01/02 11:35] Corrigindo caminho de importação para evitar dependência circular e erro de resolução.
import { ApiResponse, createSuccessResponse, createErrorResponse } from '../../types/ui/response-types';

/**
 * Interface para representar uma Receita Extra.
 */
export interface Receita {
    id: number;
    descricao: string;
    valor: number;
    data: string;
    categoria_id: number | null;
    posto_id: number | null;
    status: string | null;
    observacoes: string | null;
    usuario_id: number | null;
    created_at: string;
    Categoria?: {
        nome: string;
        cor: string | null;
        icone: string | null;
    };
}

/**
 * Interface para criação de Receita.
 */
export type ReceitaInsert = Omit<Receita, 'id' | 'created_at'>;

/**
 * Serviço para gestão de receitas extras.
 */
export const receitaService = {
    /**
     * Busca receitas por período e posto.
     * 
     * @param dataInicio - Data inicial (YYYY-MM-DD)
     * @param dataFim - Data final (YYYY-MM-DD)
     * @param postoId - ID do posto (opcional)
     * @returns Promessa com lista de receitas e suas categorias
     */
    async getByDateRange(dataInicio: string, dataFim: string, postoId?: number): Promise<ApiResponse<Receita[]>> {
        try {
            let query = supabase
                .from('Receita')
                .select('*, Categoria:CategoriaFinanceira(nome, cor, icone)')
                .gte('data', dataInicio)
                .lte('data', dataFim);

            if (postoId) {
                query = query.eq('posto_id', postoId);
            }

            const { data, error } = await query.order('data', { ascending: false });

            if (error) return createErrorResponse(error.message, 'FETCH_ERROR');
            return createSuccessResponse(data as Receita[]);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    },

    /**
     * Cria uma nova receita.
     * 
     * @param receita - Dados da receita a inserir
     * @returns Promessa com a receita criada
     */
    async create(receita: ReceitaInsert): Promise<ApiResponse<Receita>> {
        try {
            const { data, error } = await supabase
                .from('Receita')
                .insert(receita)
                .select()
                .single();

            if (error) return createErrorResponse(error.message, 'INSERT_ERROR');
            return createSuccessResponse(data as Receita);
        } catch (err) {
            return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
        }
    }
};
