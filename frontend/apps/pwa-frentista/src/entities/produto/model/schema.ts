import { z } from 'zod';

/**
 * Produto ativo do posto, como a tela de Vendas lê:
 * `select('id, nome, preco_venda, estoque_atual, categoria, unidade_medida')`.
 *
 * @remarks Todas NOT NULL em `banco/init/01-esquema-base.sql`. `preco_venda` é `numeric(10,2)`,
 *          que o PostgREST entrega como número JSON — sem coerção aqui.
 */
export const produtoSchema = z.object({
  id: z.number(),
  nome: z.string(),
  preco_venda: z.number(),
  estoque_atual: z.number(),
  categoria: z.string(),
  unidade_medida: z.string(),
});

export type Produto = z.infer<typeof produtoSchema>;

export const listaDeProdutosSchema = z.array(produtoSchema).nullable();

/** Venda do dia com o produto (join many-to-one, objeto único em runtime). */
export const vendaDeHojeSchema = z.object({
  id: z.number(),
  quantidade: z.number(),
  valor_unitario: z.number(),
  valor_total: z.number(),
  data: z.string(),
  produto: z.object({ nome: z.string(), categoria: z.string() }).nullable(),
});

export type VendaDeHoje = z.infer<typeof vendaDeHojeSchema>;

export const vendasDeHojeSchema = z.array(vendaDeHojeSchema).nullable();

/** O que a tela de Vendas manda gravar por item do carrinho (o `data` é carimbado na api). */
export const novaVendaSchema = z.object({
  frentista_id: z.number(),
  produto_id: z.number(),
  quantidade: z.number(),
  valor_unitario: z.number(),
  valor_total: z.number(),
});

export type NovaVenda = z.infer<typeof novaVendaSchema>;

/** Linha devolvida pelo insert: inteira, das quais só o `id` é conferido. */
export const vendaCriadaSchema = z.looseObject({ id: z.number() });

export type VendaCriada = z.infer<typeof vendaCriadaSchema>;
