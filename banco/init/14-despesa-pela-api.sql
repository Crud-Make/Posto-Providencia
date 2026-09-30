-- Despesas do painel pela API (#103, aba Receitas e Despesas do Fechamento de Caixa).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 carregado.
--
-- "Despesa".chave_lancamento + ordem_no_lancamento: a chave de idempotência que o painel manda com
-- cada "Lançar" (um UUID por tentativa) e a posição de cada despesa no lote. Um lançamento grava
-- várias linhas (Despesas Fixas, Taxas de Cartão) com a MESMA chave — por isso o índice único é
-- (chave, ordem), e não só a chave. O mesmo lançamento chegando duas vezes (duplo clique, ou a rede
-- caiu depois de gravar e o gerente clicou de novo) bate no índice em vez de lançar a despesa — e
-- somar no rateio do lucro — em dobro. A tabela não tinha unique nenhum. O servidor confere a
-- repetição ANTES de bater nele, para devolver as linhas já gravadas (200).
--
-- São NULL em toda linha antiga e em toda linha gravada fora da API; o índice único ignora NULL.

ALTER TABLE public."Despesa" ADD COLUMN IF NOT EXISTS chave_lancamento uuid;
ALTER TABLE public."Despesa" ADD COLUMN IF NOT EXISTS ordem_no_lancamento smallint;

CREATE UNIQUE INDEX IF NOT EXISTS despesa_chave_por_ordem
    ON public."Despesa" USING btree (chave_lancamento, ordem_no_lancamento);
