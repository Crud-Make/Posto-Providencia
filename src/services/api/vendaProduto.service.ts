import { supabase } from '../supabase';

export interface VendaProduto {
  id: number;
  frentista_id: number;
  produto_id: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  data: string;
  created_at?: string;
  Produto?: {
    nome: string;
  };
}

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
    return (data as unknown as VendaProduto[]) || [];
  }
};
