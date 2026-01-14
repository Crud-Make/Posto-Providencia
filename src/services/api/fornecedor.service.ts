import { supabase } from '../supabase';
import type { Fornecedor as FornecedorRow, InsertTables } from '../../types/database/index';

// [14/01 19:05] Alinhando tipos de Fornecedor com aliases e helpers
type Fornecedor = FornecedorRow;
type FornecedorInsert = InsertTables<'Fornecedor'>;

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
