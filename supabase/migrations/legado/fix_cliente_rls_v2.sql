-- ==========================================================
-- CORREÇÃO DEFINITIVA DE PERMISSÕES (RLS) PARA CLIENTES
-- Copie e cole todo este conteúdo no SQL Editor do Supabase e clique em RUN
-- ==========================================================

-- 1. Habilita RLS nas tabelas (caso não esteja)
ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotaFrentista" ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas para evitar duplicação ou conflito
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Cliente";
DROP POLICY IF EXISTS "Allow read for authenticated" ON "Cliente";
DROP POLICY IF EXISTS "Allow insert for authenticated" ON "Cliente";
DROP POLICY IF EXISTS "Allow update for authenticated" ON "Cliente";
DROP POLICY IF EXISTS "Users can insert own rows" ON "Cliente";
DROP POLICY IF EXISTS "Admins can do everything" ON "Cliente";

DROP POLICY IF EXISTS "Enable all for authenticated users" ON "NotaFrentista";
DROP POLICY IF EXISTS "Allow read for authenticated" ON "NotaFrentista";

-- 3. Cria política permissiva par CLIENTE (Leitura, Escrita, Edição)
-- Permite que qualquer usuário autenticado (logado) gerencie clientes
CREATE POLICY "Enable all for authenticated users" ON "Cliente"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Cria política permissiva para NOTAS (Leitura, Escrita, Edição)
CREATE POLICY "Enable all for authenticated users" ON "NotaFrentista"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Opcional: Garante permissões de GRANT para a role authenticated
GRANT ALL ON "Cliente" TO authenticated;
GRANT ALL ON "NotaFrentista" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "Cliente_id_seq" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "NotaFrentista_id_seq" TO authenticated;
