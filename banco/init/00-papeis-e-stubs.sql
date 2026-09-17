-- Papéis e stubs que o esquema do posto pressupõe e que só existem dentro do Supabase.
-- Roda antes de 01-esquema-base.sql (o entrypoint do Postgres aplica em ordem alfabética).
--
-- O que é stub aqui e por quê:
--   * anon / authenticated / service_role — papéis que as 103 policies e os GRANTs citam.
--   * auth.users — 3 FKs apontam para ela (Frentista.user_id, Usuario.auth_user_id,
--     ClienteBaratencia.user_id) e o trigger on_auth_user_created dispara nela.
--   * auth.uid() / auth.role() / auth.jwt() — 29 policies e 2 funções chamam.
--     Fora do Supabase ninguém preenche os claims; devolvem NULL / 'anon' / '{}',
--     então toda policy "para autenticados" NEGA por padrão. É o comportamento desejado:
--     a autorização passa a ser do Laravel, que conecta como dono (superusuário local)
--     e não é filtrado por RLS.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- Mínimo de auth.users para as FKs e para o seed de cadastros (id + e-mail).
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    email_confirmed_at timestamptz,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
