import { supabase } from '../supabase';
import { Database } from '../../types/database/index';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];
type FornecedorInsert = Database['public']['Tables']['Fornecedor']['Insert'];

/**
 * Serviço para gerenciamento de Fornecedores.
 */
export const fornecedorService = {
  /**
   * Busca todos os fornecedores ativos.
   * @param postoId ID do posto para filtrar (opcional)
   * @returns Lista de fornecedores ordenada por nome
   */
  async getAll(postoId?: number): Promise<Fornecedor[]> {
    let query = supabase
      .from('Fornecedor')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  /**
   * Cria um novo fornecedor.
   * @param fornecedor Dados do fornecedor
   * @returns Fornecedor criado
   */
  async create(fornecedor: FornecedorInsert): Promise<Fornecedor> {
    const { data, error } = await supabase
      .from('Fornecedor')
      .insert(fornecedor)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
