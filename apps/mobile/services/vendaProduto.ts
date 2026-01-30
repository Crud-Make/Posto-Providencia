import { supabase } from '../lib/supabase';

/**
 * Interface que representa uma venda de produto (não combustível) realizada por um frentista.
 */
export interface VendaProduto {
    /** Identificador único da venda */
    id: number;
    /** ID do frentista que realizou a venda */
    frentista_id: number;
    /** ID do produto vendido */
    produto_id: number;
    /** Quantidade vendida */
    quantidade: number;
    /** Valor unitário do produto no momento da venda */
    valor_unitario: number;
    /** Valor total da venda (quantidade * valor_unitario) */
    valor_total: number;
    /** Data da venda (ISO string) */
    data: string;
    /** ID do fechamento do frentista associado (opcional) */
    fechamento_frentista_id?: number;
    /** Dados do produto relacionado (join) */
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

