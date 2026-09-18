import { supabase } from './supabase';
import { precoMedioPonderadoProduto } from './calculos-estoque-produto';
import type { InsertTables, UpdateTables, Tables, Produto, MovimentacaoEstoque } from '../types/database/index';

/** Linha crua da tabela `Produto`, como o Postgres a devolve. */
type LinhaProduto = Tables<'Produto'>;

/**
 * Linha do banco -> tipo de dominio `Produto`.
 *
 * Duas colunas sao anulaveis no Postgres (`ativo boolean DEFAULT true`,
 * `created_at timestamptz DEFAULT now()`) e o tipo de dominio nao as aceita
 * nulas. As conversoes sao so estas duas; nenhum valor de dinheiro
 * (`preco_custo`, `preco_venda`) e tocado aqui.
 *
 * - `ativo` nulo vira `false`: toda listagem deste servico consulta com
 *   `.eq('ativo', true)`, que ja exclui `NULL`. Mapear para `false` mantem a
 *   mesma leitura em todo lugar; `true` faria um produto que nunca aparece na
 *   lista surgir como ativo na tela de detalhe.
 * - `created_at` nulo vira `undefined` — o campo e opcional no dominio, o que
 *   diz "nao se sabe quando", em vez de carimbar uma data inventada.
 */
function paraProduto(linha: LinhaProduto): Produto {
    return {
        id: linha.id,
        nome: linha.nome,
        preco_venda: linha.preco_venda,
        preco_custo: linha.preco_custo,
        estoque_atual: linha.estoque_atual,
        estoque_minimo: linha.estoque_minimo,
        categoria: linha.categoria,
        codigo_barras: linha.codigo_barras,
        unidade_medida: linha.unidade_medida,
        descricao: linha.descricao,
        ativo: linha.ativo ?? false,
        posto_id: linha.posto_id,
        created_at: linha.created_at ?? undefined,
    };
}

export const stockService = {
    // === PRODUTOS ===

    async getAllProducts(postoId?: number): Promise<Produto[]> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('ativo', true);

        if (postoId) query = query.eq('posto_id', postoId);

        const { data, error } = await query.order('nome');
        if (error) throw error;
        return (data ?? []).map(paraProduto);
    },

    async getProductById(id: number, postoId?: number): Promise<Produto | null> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('id', id);

        if (postoId) query = query.eq('posto_id', postoId);

        const { data, error } = await query.single();
        if (error) throw error;
        return paraProduto(data);
    },

    async createProduct(product: InsertTables<'Produto'>): Promise<Produto> {
        const { data, error } = await supabase
            .from('Produto')
            .insert(product)
            .select()
            .single();
        if (error) throw error;
        return paraProduto(data);
    },

    async updateProduct(id: number, product: UpdateTables<'Produto'>): Promise<Produto> {
        const { data, error } = await supabase
            .from('Produto')
            .update({ ...product, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return paraProduto(data);
    },

    async deleteProduct(id: number): Promise<void> {
        const { error } = await supabase
            .from('Produto')
            .update({ ativo: false })
            .eq('id', id);
        if (error) throw error;
    },

    // === MOVIMENTAÇÃO ===

    async registerMovement(movement: InsertTables<'MovimentacaoEstoque'> & { valor_unitario?: number }): Promise<MovimentacaoEstoque> {
        // 1. Registrar a movimentação
        const { data: moveData, error: moveError } = await supabase
            .from('MovimentacaoEstoque')
            .insert(movement)
            .select()
            .single();

        if (moveError) throw moveError;

        // 2. Atualizar o estoque do produto e custo médio.
        // `MovimentacaoEstoque.produto_id` é anulável na tabela: sem produto
        // não há estoque a mexer. A movimentação fica registrada como veio e o
        // serviço sai, em vez de adivinhar a qual produto ela pertence.
        const produtoId = movement.produto_id;
        if (produtoId === null || produtoId === undefined) return moveData;

        const { data: product } = await supabase
            .from('Produto')
            .select('estoque_atual, preco_custo')
            .eq('id', produtoId)
            .single();

        if (product) {
            let newStock = product.estoque_atual;
            let newCost = product.preco_custo;

            if (movement.tipo === 'entrada') {
                // Preço médio ponderado da loja — fórmula em
                // ./calculos-estoque-produto, congelada por teste (onda 2.2).
                newCost = precoMedioPonderadoProduto(
                    product.estoque_atual,
                    product.preco_custo,
                    movement.quantidade,
                    movement.valor_unitario
                );
                newStock += movement.quantidade;
            } else if (movement.tipo === 'saida') {
                newStock -= movement.quantidade;
            } else if (movement.tipo === 'ajuste') {
                // Ajuste simples de quantidade
                newStock += movement.quantidade;
            }

            await supabase
                .from('Produto')
                .update({
                    estoque_atual: newStock,
                    preco_custo: newCost,
                    updated_at: new Date().toISOString()
                })
                .eq('id', produtoId);
        }

        return moveData;
    },

    async getMovementsByProduct(productId: number, limit = 50): Promise<MovimentacaoEstoque[]> {
        const { data, error } = await supabase
            .from('MovimentacaoEstoque')
            .select('*')
            .eq('produto_id', productId)
            .order('data', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    },

    async getLowStockProducts(postoId?: number): Promise<Produto[]> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('ativo', true);

        if (postoId) query = query.eq('posto_id', postoId);

        const { data, error } = await query;
        if (error) throw error;

        return (data ?? [])
            .filter(p => p.estoque_atual <= p.estoque_minimo)
            .map(paraProduto);
    }
};
