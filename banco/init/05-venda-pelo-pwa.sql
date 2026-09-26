-- Venda de produto pelo PWA do frentista, pela API (#101, fatia 2 —
-- docs/design/fechamento-frentista-api.md §8.6).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01, 03 e 04 carregados.
--
-- "VendaProduto".chave_venda: a chave de idempotência que o PWA manda com o carrinho (um UUID por
-- tentativa). O carrinho vira uma linha por produto, todas com a MESMA chave — por isso o índice
-- único é (chave_venda, produto_id), e não só a chave: o mesmo carrinho chegando duas vezes (a rede
-- caiu depois de gravar e o aparelho repetiu) bate no índice em vez de lançar a venda em dobro. O
-- servidor confere a repetição ANTES de bater nele, para devolver as linhas já gravadas (200).
--
-- É NULL em toda linha antiga e em toda linha gravada fora da API; o índice único ignora NULL.

ALTER TABLE public."VendaProduto" ADD COLUMN IF NOT EXISTS chave_venda uuid;

CREATE UNIQUE INDEX IF NOT EXISTS venda_produto_chave_por_produto
    ON public."VendaProduto" USING btree (chave_venda, produto_id);
