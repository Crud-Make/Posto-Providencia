import { describe, it, expect } from 'vitest';
import { novaVendaSchema, produtoSchema, vendaCriadaSchema, vendaDeHojeSchema } from './schema';

/**
 * Linhas fixas no formato do PostgREST, montadas a partir de `banco/init/01-esquema-base.sql`
 * (`Produto`, `VendaProduto`). Não são cópia de produção.
 */
const PRODUTO = { id: 7, nome: 'Óleo 20W50 1L', preco_venda: 32.9, estoque_atual: 14, categoria: 'Lubrificantes', unidade_medida: 'unidade' };
const VENDA = {
    id: 55, quantidade: 2, valor_unitario: 32.9, valor_total: 65.8, data: '2026-09-22T15:03:11.5+00:00',
    produto: { nome: 'Óleo 20W50 1L', categoria: 'Lubrificantes' },
};

describe('entities/produto — schema', () => {
    it('produto como vem do banco', () => {
        expect(produtoSchema.parse(PRODUTO)).toEqual(PRODUTO);
    });

    it('venda de hoje como vem do banco, e sem o produto (join nulo)', () => {
        expect(vendaDeHojeSchema.parse(VENDA)).toEqual(VENDA);
        expect(vendaDeHojeSchema.parse({ ...VENDA, produto: null })).toEqual({ ...VENDA, produto: null });
    });

    it('nova venda: os 5 campos que a tela manda', () => {
        const nova = { frentista_id: 1, produto_id: 7, quantidade: 2, valor_unitario: 32.9, valor_total: 65.8 };
        expect(novaVendaSchema.parse(nova)).toEqual(nova);
    });

    it('linha criada volta inteira', () => {
        const linha = { ...VENDA, frentista_id: 1, produto_id: 7, fechamento_frentista_id: null, created_at: '2026-09-22T15:03:11.5+00:00' };
        expect(vendaCriadaSchema.parse(linha)).toEqual(linha);
    });

    it('não coage: preço em texto é recusado', () => {
        expect(produtoSchema.safeParse({ ...PRODUTO, preco_venda: '32.90' }).success).toBe(false);
    });
});
