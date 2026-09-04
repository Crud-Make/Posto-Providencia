-- =============================================================================
-- `Fechamento.total_vendas` e `Fechamento.diferenca` passam a aceitar NULL.
--
-- PROBLEMA (auditoria de entrega, 03/09/2026):
--   O pai do dia nasce zerado — `total_vendas: 0, diferenca: 0, status: 'ABERTO'`
--   (PWA, `getOrCreateFechamento`) — porque as duas colunas são NOT NULL e o
--   tipo manual do app as declara `number`. Não existe "ainda não apurado";
--   existe zero. E zero na coluna `diferenca` lê como "conferido e bateu".
--
--   `consolidarFechamento` (`packages/api-core/src/encerrante.ts`) está certa em
--   NÃO gravar venda quando faltam bicos — mas "não gravar" deixa o zero do
--   insert. Resultado medido em 04/09/2026: os 7 dias reais desde 30/08 estão
--   `ABERTO` com `diferenca = 0`, e 28–29/08 têm as 6 leituras no banco e o pai
--   zerado do mesmo jeito (R$ 115,81 de diferença não acusada). O relatório
--   diário rotula "Pendente" mas mostra R$ 0,00 em cinza; `aiService` soma o
--   zero nas médias como caixa que bateu. É a falha silenciosa que a V5 da
--   skill de entrega chama de pior cenário.
--
-- O QUE MUDA:
--   NULL  = não apurado (sem encerrante, ou encerrante pela metade).
--   0     = apurado, e bateu.
--   Quem grava número é só a consolidação, com os 6 bicos lidos. O app passa a
--   criar o pai com NULL nos dois campos e a tratar NULL como "—" em toda tela.
--
-- O QUE NÃO MUDA:
--   `status` continua sendo "o dono fechou o dia no painel" — a consolidação
--   automática não promove a FECHADO (às 18h, com 1 de 3 frentistas enviados,
--   seria fechar cedo demais). `total_recebido` segue NOT NULL: é a soma dos
--   filhos e 0 é o valor honesto antes do primeiro envio.
--   O GRANT UPDATE por coluna (20260816) e a janela de edição ficam como estão.
--
-- BACKFILL:
--   Só os pais que nasceram zerados e nunca foram apurados: `ABERTO` com os dois
--   campos em 0. Os 205 dias da carga histórica (jan–jul) e os 27 de agosto
--   estão `FECHADO` com valores reais e não são tocados. O guard abaixo aborta
--   se aparecer um `ABERTO` com valor — seria dado que eu não previ.
--
-- REVERTER:
--   UPDATE public."Fechamento" SET total_vendas = 0, diferenca = 0
--    WHERE total_vendas IS NULL OR diferenca IS NULL;
--   ALTER TABLE public."Fechamento"
--     ALTER COLUMN total_vendas SET NOT NULL,
--     ALTER COLUMN diferenca    SET NOT NULL;
--
-- Idempotente.
-- =============================================================================

BEGIN;

-- 0. Guarda — `ABERTO` com valor gravado é estado que este script não conhece.
DO $$
DECLARE
    estranhos integer;
BEGIN
    SELECT count(*) INTO estranhos
      FROM public."Fechamento"
     WHERE status = 'ABERTO'
       AND (coalesce(total_vendas, 0) <> 0 OR coalesce(diferenca, 0) <> 0);

    IF estranhos > 0 THEN
        RAISE EXCEPTION
            'Abortado: % fechamento(s) ABERTO com total_vendas/diferenca preenchidos. Audite antes de reaplicar.',
            estranhos;
    END IF;
END $$;

-- 1. As duas colunas aceitam "não apurado".
ALTER TABLE public."Fechamento"
    ALTER COLUMN total_vendas DROP NOT NULL,
    ALTER COLUMN diferenca    DROP NOT NULL;

COMMENT ON COLUMN public."Fechamento".total_vendas IS
    'Venda do concentrador (Σ Leitura.valor_total do dia). NULL = não apurado: sem encerrante ou encerrante incompleto. Gravado só pela consolidação com todos os bicos lidos.';
COMMENT ON COLUMN public."Fechamento".diferenca IS
    'concentrador − conferido. Positivo = FALTA, negativo = SOBRA. NULL = não apurado (ver total_vendas); 0 = apurado e bateu.';

-- 2. Backfill: o pai que nasceu zerado e nunca foi apurado vira NULL.
UPDATE public."Fechamento"
   SET total_vendas = NULL,
       diferenca    = NULL
 WHERE status = 'ABERTO'
   AND total_vendas = 0
   AND diferenca    = 0;

-- 3. Verificação — prova antes de commitar.
DO $$
DECLARE
    nao_nulas   integer;
    zerados     integer;
BEGIN
    SELECT count(*) INTO nao_nulas
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Fechamento'
       AND column_name IN ('total_vendas', 'diferenca')
       AND is_nullable = 'NO';
    IF nao_nulas > 0 THEN
        RAISE EXCEPTION 'Abortado: coluna ainda NOT NULL em Fechamento.';
    END IF;

    SELECT count(*) INTO zerados
      FROM public."Fechamento"
     WHERE status = 'ABERTO' AND total_vendas = 0 AND diferenca = 0;
    IF zerados > 0 THEN
        RAISE EXCEPTION 'Abortado: sobrou % pai ABERTO zerado sem backfill.', zerados;
    END IF;
END $$;

COMMIT;
