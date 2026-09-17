import { supabase } from './supabase';
import { precoMedioPonderadoProduto } from './calculos-estoque-produto';
import type { InsertTables, UpdateTables, Produto, MovimentacaoEstoque } from '../types/database/index';

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
        return data || [];
    },

    async getProductById(id: number, postoId?: number): Promise<Produto | null> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('id', id);

        if (postoId) query = query.eq('posto_id', postoId);

        const { data, error } = await query.single();
        if (error) throw error;
        return data;
    },

    async createProduct(product: InsertTables<'Produto'>): Promise<Produto> {
        const { data, error } = await supabase
            .from('Produto')
            .insert(product)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProduct(id: number, product: UpdateTables<'Produto'>): Promise<Produto> {
        const { data, error } = await supabase
            .from('Produto')
            .update({ ...product, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
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

        // 2. Atualizar o estoque do produto e custo médio
        const { data: product } = await supabase
            .from('Produto')
            .select('estoque_atual, preco_custo')
            .eq('id', movement.produto_id)
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
                .eq('id', movement.produto_id);
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

        return (data || []).filter(p => p.estoque_atual <= p.estoque_minimo);
    }
};
