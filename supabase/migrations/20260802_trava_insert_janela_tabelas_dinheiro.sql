-- =============================================================================
-- Trava o INSERT anônimo das tabelas de dinheiro a uma janela de 7 dias.
--
-- PROBLEMA (medido em 02/08/2026, probe com a anon key do bundle publicado):
--   `INSERT` anônimo responde sucesso em 10 tabelas. Entre elas as 4 que
--   sustentam o cálculo do fechamento:
--
--     Leitura, Fechamento, FechamentoFrentista, Recebimento
--
--   Ou seja: um curl lança fechamento no nome de qualquer frentista, em
--   qualquer data do passado. A migração de 31/07 fechou o DELETE do histórico
--   de `Leitura`, mas o INSERT ficou de fora — dá pra sujar o passado sem
--   apagar nada, e a divergência aparece como "falta do frentista".
--
-- POR QUE JANELA DE DATA, DE NOVO:
--   Mesmo raciocínio da migração de 31/07: a RLS decide linha a linha e não
--   sabe contar. O que dá pra dizer é QUAIS linhas são elegíveis. Todo caminho
--   legítimo de escrita do app é do dia corrente (o PWA regrava sempre o dia,
--   o painel fecha o caixa do dia), então a data é o corte natural.
--
-- ESCOPO DELIBERADAMENTE ESTREITO — esta migração NÃO cria, não altera e não
-- derruba policy de SELECT, UPDATE ou DELETE. Só INSERT.
--   Motivo: no momento em que ela foi escrita, o estado das policies de
--   UPDATE/DELETE das outras tabelas NÃO era conhecido — o PostgREST devolve
--   204 tanto para "permitido, 0 linhas" quanto para "negado", então o probe
--   por HTTP não distingue os dois (ver nota no rodapé da migração de 31/07).
--   Recriar essas policies às cegas poderia ABRIR um DELETE que hoje está
--   fechado. Apertar só o INSERT é o que dá pra fazer com segurança sem ler
--   `pg_policies`.
--
-- O CASO `ALL`: uma policy `FOR ALL` cobre INSERT sem dizer o nome dele. Se
--   existir, ela é rebaixada para SELECT/UPDATE/DELETE com o MESMO predicado —
--   o comportamento desses três não muda em nada — e o INSERT passa a ser
--   governado só pela policy nova, restrita.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA    — igual. Sempre escreve o dia corrente.
--   Painel — fechar o caixa do dia, igual. Lançar fechamento retroativo de
--            MAIS de 7 dias deixa de funcionar pela tela e passa a exigir o
--            painel do Supabase. Mesmo trade-off já aceito em 31/07 para o
--            DELETE — confirme que continua valendo para o INSERT.
--   Ataque — sujar o histórico deixa de ser possível. A semana corrente segue
--            gravável, e é reconstruível a partir da planilha.
--
-- NÃO RESOLVE: UPDATE segue como estava (aberto, coberto pela auditoria de
--   31/07). Fechar o vetor de escrita de vez exige auth real ou Edge Function.
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

BEGIN;

-- Janela única, num lugar só, para as 4 tabelas não divergirem com o tempo.
CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_escrita(quando timestamptz)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  -- Passado: 7 dias, igual à trava de DELETE de 31/07.
  -- Futuro: 1 dia de folga, para não brigar com fuso na virada do dia
  --         (o posto é GMT-3; o servidor pensa em UTC — ver a varredura de fuso
  --         de 31/07 e o TZ fixado na suíte em 02/08).
  SELECT quando >= (CURRENT_DATE - INTERVAL '7 days')
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$$;

-- -----------------------------------------------------------------------------
-- 1. Rebaixa policies `ALL` das tabelas alvo, preservando o predicado.
--
-- Varredura por catálogo, nunca por nome: há policies criadas pelo painel do
-- Supabase que não constam de arquivo nenhum neste repositório (a migração de
-- 31/07 encontrou 6 onde o git conhecia 4).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p       record;
  alvo    text[] := ARRAY['Leitura','Fechamento','FechamentoFrentista','Recebimento'];
  usando  text;
  checando text;
BEGIN
  FOR p IN
    SELECT policyname, tablename, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(alvo) AND cmd = 'ALL'
  LOOP
    usando   := COALESCE(p.qual, 'true');
    checando := COALESCE(p.with_check, usando);

    -- SELECT e DELETE só têm USING; UPDATE tem os dois. Mesmo predicado de
    -- antes, para que nada além do INSERT mude de comportamento.
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)',
                   p.policyname || '_select', p.tablename, array_to_string(p.roles, ','), usando);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO %s USING (%s)',
                   p.policyname || '_delete', p.tablename, array_to_string(p.roles, ','), usando);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
                   p.policyname || '_update', p.tablename, array_to_string(p.roles, ','), usando, checando);

    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);

    RAISE NOTICE 'policy ALL "%" em % rebaixada para SELECT/UPDATE/DELETE', p.policyname, p.tablename;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Derruba as policies de INSERT existentes e instala a janela.
--
-- As policies são OR entre si, não AND: uma única `WITH CHECK (true)`
-- sobrevivente reabriria tudo. Por isso derruba todas antes de criar a nova.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p    record;
  alvo text[] := ARRAY['Leitura','Fechamento','FechamentoFrentista','Recebimento'];
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(alvo) AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public."Leitura"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Fechamento"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FechamentoFrentista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recebimento"         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_insert_janela_7d" ON public."Leitura"
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.dentro_da_janela_de_escrita(data));

CREATE POLICY "fechamento_insert_janela_7d" ON public."Fechamento"
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.dentro_da_janela_de_escrita(data));

-- `Recebimento` e `FechamentoFrentista` NÃO têm coluna de data — as duas
-- penduram no `Fechamento` pai por `fechamento_id`, e a janela vem de lá.
-- Sem pai elegível, sem linha: isso também mata o INSERT órfão, hoje aceito.
--
-- ⚠️ Conferido contra a API real em 02/08, não contra `database.types.ts`: os
--    tipos gerados declaram `Recebimento.data` e `Recebimento.created_at`, que
--    NÃO existem no banco. Os tipos estão fora de sincronia — regerar pela CLI.
CREATE POLICY "recebimento_insert_janela_7d" ON public."Recebimento"
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Fechamento" f
      WHERE f.id = fechamento_id
        AND public.dentro_da_janela_de_escrita(f.data)
    )
  );

CREATE POLICY "fechamento_frentista_insert_janela_7d" ON public."FechamentoFrentista"
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Fechamento" f
      WHERE f.id = fechamento_id
        AND public.dentro_da_janela_de_escrita(f.data)
    )
  );

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO (rodar depois de aplicar)
--
--   -- as policies de INSERT das 4, e só elas:
--   SELECT tablename, policyname, cmd, with_check FROM pg_policies
--   WHERE schemaname='public'
--     AND tablename IN ('Leitura','Fechamento','FechamentoFrentista','Recebimento')
--   ORDER BY tablename, cmd;
--
-- Pela API pública (anon), o esperado passa a ser:
--   POST /rest/v1/Leitura  {"data":"<hoje>", ...}        -> 201  (PWA segue OK)
--   POST /rest/v1/Leitura  {"data":"2026-01-15", ...}    -> 401/403 (42501)
--
-- Atenção: aqui o status HTTP É prova, ao contrário do DELETE. Uma policy de
-- INSERT que nega levanta 42501 "new row violates row-level security policy" —
-- erro explícito, não "gravou zero linhas em silêncio".
-- =============================================================================
