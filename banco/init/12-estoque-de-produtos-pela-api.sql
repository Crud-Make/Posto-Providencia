-- Produtos e Estoque (loja) do painel pela API (#103, docs/design/painel-pela-api.md §12).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 carregado.
--
-- Duas chaves de idempotência, uma por gravação que o gerente pode repetir sem querer (duplo clique,
-- ou a rede caiu depois de gravar e ele clicou de novo). O painel gera um UUID por abertura do modal:
--
-- "MovimentacaoEstoque".chave_movimentacao — a "Registrar Movimentação". Repetida, somaria (ou
--   subtrairia) o `Produto.estoque_atual` duas vezes e refaria o custo médio sobre o estoque já
--   somado. Uma movimentação é UMA linha, então o índice é só a chave.
-- "Produto".chave_cadastro — o "Novo Produto". Repetido, criaria o produto duas vezes (com o
--   estoque inicial em dobro no total da loja).
--
-- O servidor confere a repetição ANTES de bater no índice, para devolver o já gravado (200); o índice
-- segura a corrida de duas requisições simultâneas. É NULL em toda linha antiga e em toda linha
-- gravada fora da API; o índice único ignora NULL. Nenhuma coluna existente muda.

ALTER TABLE public."MovimentacaoEstoque" ADD COLUMN IF NOT EXISTS chave_movimentacao uuid;

CREATE UNIQUE INDEX IF NOT EXISTS movimentacao_estoque_chave
    ON public."MovimentacaoEstoque" USING btree (chave_movimentacao);

ALTER TABLE public."Produto" ADD COLUMN IF NOT EXISTS chave_cadastro uuid;

CREATE UNIQUE INDEX IF NOT EXISTS produto_chave_cadastro
    ON public."Produto" USING btree (chave_cadastro);
