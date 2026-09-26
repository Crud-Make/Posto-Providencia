-- Registro de Compras do painel pela API (#103, docs/design/painel-pela-api.md "Registro de Compras").
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 carregado.
--
-- "Compra".chave_compra: a chave de idempotência que o painel manda com o "Salvar" (um UUID por
-- tentativa). Um salvar grava uma linha de Compra por combustível, todas com a MESMA chave — por isso
-- o índice único é (chave_compra, combustivel_id), e não só a chave. O mesmo salvar chegando duas
-- vezes (duplo clique, ou a rede caiu depois de gravar e o gerente clicou de novo) bate no índice em
-- vez de lançar a compra — e somar os litros no Estoque e no Tanque — em dobro. O servidor confere a
-- repetição ANTES de bater nele, para devolver as linhas já gravadas (200).
--
-- É NULL em toda linha antiga e em toda linha gravada fora da API; o índice único ignora NULL.

ALTER TABLE public."Compra" ADD COLUMN IF NOT EXISTS chave_compra uuid;

CREATE UNIQUE INDEX IF NOT EXISTS compra_chave_por_combustivel
    ON public."Compra" USING btree (chave_compra, combustivel_id);
