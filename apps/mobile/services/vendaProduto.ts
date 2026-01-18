import { supabase } from '../lib/supabase';
import type { VendaProduto as VendaProdutoDb } from '@posto/types';

export interface VendaProduto extends VendaProdutoDb {
    Produto?: { nome: string };
}

/**
 * Interface para os dados necessários para criar uma nova venda de produto.
 */
interface CreateVendaProdutoInput {
    /** ID do frentista */
    frentista_id: number;
    /** ID do produto */
    produto_id: number;
    /** Quantidade vendida */
    quantidade: number;
    /** Valor unitário do produto */
    valor_unitario: number;
    /** ID do posto */
    posto_id: number;
}

/**
 * Serviço para gerenciar operações relacionadas a vendas de produtos.
 */
export const vendaProdutoService = {
    /**
     * Busca as vendas de produtos realizadas por um frentista na data atual.
     * 
     * @param {number} frentistaId - ID do frentista.
     * @returns {Promise<VendaProduto[]>} Lista de vendas de hoje ordenadas por ID decrescente.
     */
    async getByFrentistaToday(frentistaId: number): Promise<VendaProduto[]> {
        const today = new Date().toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from('VendaProduto')
            .select('*, Produto (nome)')
            .eq('frentista_id', frentistaId)
            .eq('data', today)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao buscar vendas de hoje:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Cria um novo registro de venda de produto.
     * Calcula automaticamente o valor total.
     * 
     * @param {CreateVendaProdutoInput} input - Dados da venda.
     * @returns {Promise<VendaProduto | null>} A venda criada ou null em caso de erro.
     */
    async create(input: CreateVendaProdutoInput): Promise<VendaProduto | null> {
        const valor_total = input.quantidade * input.valor_unitario;

        const { data, error } = await supabase
            .from('VendaProduto')
            .insert({
                frentista_id: input.frentista_id,
                produto_id: input.produto_id,
                quantidade: input.quantidade,
                valor_unitario: input.valor_unitario,
                valor_total,
                posto_id: input.posto_id,
                data: new Date().toISOString(),
            })
            .select('*, Produto (nome)')
            .single();

        if (error) {
            console.error('Erro ao criar venda de produto:', error);
            return null;
        }

        return data;
    },
};
