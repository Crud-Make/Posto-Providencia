-- =============================================================================
-- Trava o DELETE de `Leitura` a uma janela de 7 dias + auditoria das 3 tabelas
-- de dinheiro.
--
-- PROBLEMA (medido em 31/07/2026, probe com a anon key do bundle publicado):
--   As 12 tabelas centrais respondiam 204 a um DELETE anônimo. Qualquer pessoa
--   com a chave — que é pública por desenho e vai no JavaScript do site na
--   Vercel — apagava as 276 linhas de `Leitura`, base de todo o cálculo de
--   fechamento, com um único curl.
--
-- POR QUE A TRAVA É POR DATA, E NÃO POR QUANTIDADE:
--   A RLS decide linha a linha; ela não sabe contar. Não existe policy "no
--   máximo N linhas por comando". Só dá pra dizer QUAIS linhas são elegíveis.
--   Como os dois caminhos legítimos de DELETE do app são sempre escopados por
--   data (`leitura.service.ts` deleteByDate/deleteByShift e o replace diário do
--   PWA em `apps/pwa-frentista/src/services/api.ts`), a data é o corte natural.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA    — igual. Ele apaga e regrava SEMPRE o dia corrente.
--   Painel — corrigir um valor antigo (UPDATE por id) continua funcionando.
--            Refazer um DIA INTEIRO antigo deixa de funcionar pela tela; passa
--            a exigir o painel do Supabase. Decisão consciente do dono.
--   Ataque — apagar o histórico deixa de ser possível: 264 das 276 linhas
--            saem do alcance. Só a semana corrente segue apagável, e ela é
--            reconstruível a partir da planilha.
--
-- O QUE ESTA MIGRAÇÃO NÃO RESOLVE:
--   UPDATE segue liberado em qualquer data (escolha do dono, para não perder a
--   correção pontual pela tela). É exatamente o vetor da alteração silenciosa —
--   por isso a auditoria abaixo existe. Ela não previne; ela faz descobrir.
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Policies de `Leitura`
--
-- Derruba TODAS as policies existentes por varredura de pg_policies, nunca por
-- nome. Há policies criadas pelo painel do Supabase que não constam de arquivo
-- nenhum neste repositório — apagar por nome deixaria sobrevivente silencioso,
-- e uma única policy `USING (true)` remanescente reabre tudo (as policies são
-- OR entre si, não AND).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Leitura'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public."Leitura"', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public."Leitura" ENABLE ROW LEVEL SECURITY;

-- Leitura e escrita seguem abertas: o painel e o PWA falam com o banco como
-- `anon` (o login do web foi removido em 29/07 por ser código inalcançável, e o
-- PWA nunca autenticou, por decisão explícita). Fechar aqui derruba as duas
-- telas. O ganho desta migração está no DELETE, logo abaixo.
CREATE POLICY "leitura_select_anon"  ON public."Leitura" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leitura_insert_anon"  ON public."Leitura" FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "leitura_update_anon"  ON public."Leitura" FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- A trava. `data` é timestamptz; comparar com CURRENT_DATE pega o dia inteiro.
-- A janela de 7 dias foi dimensionada contra o banco real: cobre o replace
-- diário do PWA e a correção da semana, e deixa 264 das 276 linhas fora de
-- alcance.
CREATE POLICY "leitura_delete_janela_7d" ON public."Leitura"
  FOR DELETE TO anon, authenticated
  USING (data >= (CURRENT_DATE - INTERVAL '7 days'));

-- -----------------------------------------------------------------------------
-- 2. Auditoria append-only das 3 tabelas de dinheiro
--
-- Não previne nada — registra. Hoje uma alteração silenciosa (UPDATE que muda
-- um encerrante de 1.000 para 1.100) é indetectável: a reimportação da planilha
-- só conserta o que se sabe estar errado, e ninguém sabe. Com o log, a
-- divergência tem origem rastreável em vez de virar "falta do frentista".
--
-- `anon` NÃO recebe grant nenhum nesta tabela e a RLS fica ligada sem policy —
-- ou seja, quem escreve pelo gatilho consegue, mas ninguém lê, altera ou apaga
-- o log pela API. É por isso que a função é SECURITY DEFINER.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."AuditoriaDados" (
  id          bigserial PRIMARY KEY,
  tabela      text        NOT NULL,
  operacao    text        NOT NULL,
  registro_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  em          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_dados_em_idx     ON public."AuditoriaDados" (em DESC);
CREATE INDEX IF NOT EXISTS auditoria_dados_tabela_idx ON public."AuditoriaDados" (tabela, em DESC);

ALTER TABLE public."AuditoriaDados" ENABLE ROW LEVEL SECURITY;

-- Sem policy alguma + sem grant = invisível e intocável pela API pública.
-- Consulta só pelo painel do Supabase (service_role ignora RLS).
REVOKE ALL ON public."AuditoriaDados"          FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public."AuditoriaDados_id_seq" FROM anon, authenticated;

-- SECURITY DEFINER: roda com o dono da função, então grava no log mesmo o
-- chamador sendo `anon` sem grant. `search_path` fixo é obrigatório aqui —
-- sem ele, uma função SECURITY DEFINER pode ser sequestrada por um schema
-- plantado no caminho de busca do chamador.
CREATE OR REPLACE FUNCTION public.registra_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Ramos explícitos, não CASE: num gatilho de DELETE o registro NEW não existe
  -- (e em INSERT o OLD não existe). Tocar no que não foi atribuído levanta
  -- "record NEW is not assigned yet" e derruba o DELETE inteiro junto — o
  -- gatilho de auditoria viraria uma trava acidental.
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD) ->> 'id', to_jsonb(OLD), NULL);

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW) ->> 'id', to_jsonb(OLD), to_jsonb(NEW));

  ELSE  -- INSERT: nenhum gatilho usa hoje, mas mantém a função reaproveitável
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW) ->> 'id', NULL, to_jsonb(NEW));
  END IF;

  RETURN NULL;  -- AFTER trigger: o retorno é ignorado
END $$;

-- INSERT fica de fora de propósito: é o fluxo normal e diário do PWA, geraria
-- volume sem informação. O que interessa é o que MUDA ou SOME.
DROP TRIGGER IF EXISTS audita_leitura              ON public."Leitura";
DROP TRIGGER IF EXISTS audita_fechamento           ON public."Fechamento";
DROP TRIGGER IF EXISTS audita_fechamento_frentista ON public."FechamentoFrentista";

CREATE TRIGGER audita_leitura
  AFTER UPDATE OR DELETE ON public."Leitura"
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

CREATE TRIGGER audita_fechamento
  AFTER UPDATE OR DELETE ON public."Fechamento"
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

CREATE TRIGGER audita_fechamento_frentista
  AFTER UPDATE OR DELETE ON public."FechamentoFrentista"
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO (rodar depois de aplicar)
--
--   -- as 4 policies de Leitura, e só elas:
--   SELECT policyname, cmd, qual FROM pg_policies
--   WHERE tablename = 'Leitura' ORDER BY cmd;
--
--   -- o log tem que estar vazio e inacessível pela API:
--   SELECT count(*) FROM public."AuditoriaDados";
--
-- Pela API pública (anon), o esperado passa a ser:
--   DELETE /rest/v1/Leitura?data=eq.<hoje>        -> 204  (PWA segue funcionando)
--   DELETE /rest/v1/Leitura?id=eq.-1              -> 204  (0 linhas, inócuo)
--   DELETE /rest/v1/Leitura?data=lt.2026-07-01    -> 204 mas apaga 0 linhas
--   GET    /rest/v1/AuditoriaDados                -> 401/404 (invisível)
--
-- Atenção ao verificar: o PostgREST devolve 204 mesmo quando a RLS filtrou tudo
-- — DELETE sem linha elegível não é erro, é "apagou zero". Por isso a prova é
-- CONTAR as linhas antes e depois, nunca olhar o status HTTP.
-- =============================================================================
