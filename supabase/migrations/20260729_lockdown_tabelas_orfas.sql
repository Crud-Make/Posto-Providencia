-- Tranca as tabelas que NENHUM app acessa e que hoje respondem a qualquer anônimo.
--
-- Contexto (probe de 29/07/2026, read-only, com a anon key):
--   As 5 tabelas abaixo devolveram HTTP 200 para requisição sem autenticação.
--   A anon key é pública por design — ela vai no bundle publicado
--   (apps/web/dist/assets/index-*.js) — então quem abre o site consegue lê-las.
--   O que deveria segurar a porta é a RLS, e nelas não há policy nenhuma.
--
-- Por que estas 5 primeiro: um grep por `.from('<tabela>')` em apps/web,
-- apps/pwa-frentista e packages não encontra uso de nenhuma delas. Trancar não
-- pode quebrar tela alguma — é o único bloco com risco zero.
--
-- Fora deste arquivo de propósito:
--   - Tabelas só do web (Despesa, Emprestimo, Cliente, …): dependem de consertar
--     antes a regressão de `user_has_posto_access` (ver 20260127_fix_operational_rls.sql,
--     que reintroduziu o cast quebrado `auth.uid()::text::integer`).
--   - Tabelas do PWA (Bico, Fechamento, FechamentoFrentista, Frentista, Leitura,
--     Produto, VendaProduto): o PWA do frentista NÃO autentica; trancá-las hoje
--     derruba o envio pelo celular. Exige decisão de arquitetura.
--
-- ATENÇÃO: o banco ao vivo está ATRÁS das migrations — existem policies postas
-- pelo painel que não constam de nenhum arquivo. Por isso as policies são
-- derrubadas por varredura do catálogo, e não por nome: DROP POLICY por nome
-- silenciosamente não faria nada contra uma policy que este repositório não conhece.

DO $$
DECLARE
  t text;
  p record;
  orfas text[] := ARRAY[
    'CarteiraBaratencia',
    'ClienteBaratencia',
    'PromocaoBaratencia',
    'TransacaoBaratencia',
    'TokenAbastecimento'
  ];
BEGIN
  FOREACH t IN ARRAY orfas LOOP
    -- A tabela pode não existir no ambiente (o banco diverge das migrations).
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      RAISE NOTICE 'ignorada (não existe): %', t;
      CONTINUE;
    END IF;

    -- 1. Derruba toda policy existente, inclusive as criadas pelo painel.
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      RAISE NOTICE 'policy removida: %.%', t, p.policyname;
    END LOOP;

    -- 2. Liga a RLS. Sem policy, nenhuma linha passa — nem para `authenticated`.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 3. Tira o privilégio de tabela dos roles do PostgREST.
    --    Só a RLS já bastaria para não vazar linha, mas o PostgREST responderia
    --    200 com lista vazia — indistinguível de "tabela vazia". Sem o GRANT ele
    --    responde 401/403, o que torna o resultado do probe inequívoco.
    --    `service_role` ignora RLS e mantém acesso para rotinas administrativas.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);

    RAISE NOTICE 'trancada: %', t;
  END LOOP;
END $$;
