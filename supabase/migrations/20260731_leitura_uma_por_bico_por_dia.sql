-- =============================================================================
-- Uma leitura por bico por dia — turno deixa de participar da unicidade
--
-- REGRA DE NEGÓCIO (confirmada pelo dono em 31/07/2026):
--   O posto **não trabalha por turno**. É um encerrante por bico por dia, um a um.
--   A planilha diz o mesmo: `docs/data/posto_jorro_2026.sqlite` → `encerrante_diario`
--   tem chave `ano/mes/dia/bico`, sem nenhuma coluna de turno (1236 linhas, 206 dias,
--   0 duplicatas por essa chave). A tabela `Turno` tem 3 linhas (Manhã/Tarde/Noite),
--   mas só o turno 1 jamais foi usado.
--
-- O QUE ISSO CONSERTA:
--   270 das 276 linhas tinham `turno_id` NULL (o histórico do ETL); só as 6 de 26/07,
--   gravadas pelo app, tinham `turno_id = 1`. Como `.eq('turno_id', 1)` não casa com
--   NULL, o painel **nunca enxergou o histórico** para apagá-lo — e a agregação, que
--   não filtra turno, somava as duas versões do mesmo dia. Medido em probe revertido
--   no dia 10/07: 6 linhas → 12, litros 1.485,642 → 2.971,284. Dobrava.
--
-- POR QUE `(bico_id, data)` E NÃO `(bico_id, data, turno_id)`:
--   Com turno fora da regra de negócio, incluí-lo na chave só recria o buraco: bastaria
--   gravar o mesmo dia com outro turno para duplicar de novo. `(bico_id, data)` é a
--   chave real, a mesma da planilha.
--
-- SEGURANÇA:
--   Só `turno_id` muda. Nenhum litro, preço ou valor é tocado. Conferido antes de
--   aplicar: `count(distinct (bico_id, data)) = 276` = total de linhas, ou seja, já não
--   havia duplicata por essa chave. Totais de referência: 60.528,048 L / R$ 392.825,83.
--   O UPDATE dispara o gatilho de auditoria — as 270 linhas ficam registradas em
--   `AuditoriaDados` com antes/depois, que é exatamente o comportamento desejado.
-- =============================================================================

BEGIN;

UPDATE public."Leitura" SET turno_id = 1 WHERE turno_id IS NULL;

DROP INDEX IF EXISTS public.leitura_unica_bico_data_turno;

CREATE UNIQUE INDEX IF NOT EXISTS leitura_unica_bico_data
  ON public."Leitura" (bico_id, data);

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO (os totais têm que ser idênticos aos de antes):
--   SELECT count(*), count(*) FILTER (WHERE turno_id IS NULL) AS nulos,
--          round(sum(litros_vendidos)::numeric,3) AS litros,
--          round(sum(valor_total)::numeric,2)     AS valor
--   FROM public."Leitura";
--   -- esperado: 276 | 0 | 60528.048 | 392825.83
--
-- Desfazer:
--   DROP INDEX IF EXISTS public.leitura_unica_bico_data;
--   -- o backfill de turno NÃO se desfaz pelo valor antigo: consulte AuditoriaDados,
--   -- que guarda o antes/depois linha a linha.
-- =============================================================================
