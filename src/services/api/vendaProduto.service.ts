import { supabase } from '../supabase';
import type { VendaProduto as VendaProdutoBase, Produto } from '../../types/database/aliases';
import type { WithRelations } from '../../types/ui/helpers';

// [14/01 16:10] VendaProduto alinhado com tipos do Supabase e relacionamento Produto
export type VendaProduto = WithRelations<
  VendaProdutoBase,
  {
    Produto?: Pick<Produto, 'nome'>;
  }
>;

export const vendaProdutoService = {
  /**
   * Busca vendas de produtos por frentista e data
   */
  async getByFrentistaAndDate(frentistaId: number, date: string): Promise<VendaProduto[]> {
    const { data, error } = await supabase
      .from('VendaProduto')
      .select('*, Produto(nome)')
      .eq('frentista_id', frentistaId)
      .eq('data', date);
      
    if (error) throw error;
    return (data || []) as VendaProduto[];
  }
};
