-- ============================================
-- CORREÇÃO DE RLS PARA TABELA POSTO
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Primeiro, verifica se RLS está habilitado (só habilita se não estiver)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'Posto' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE "Posto" ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Remove políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow authenticated users to read postos" ON "Posto";
DROP POLICY IF EXISTS "Allow authenticated users to insert postos" ON "Posto";
DROP POLICY IF EXISTS "Allow authenticated users to update postos" ON "Posto";
DROP POLICY IF EXISTS "Allow authenticated users to delete postos" ON "Posto";
DROP POLICY IF EXISTS "Users can read postos" ON "Posto";
DROP POLICY IF EXISTS "Admins can insert postos" ON "Posto";
DROP POLICY IF EXISTS "Admins can update postos" ON "Posto";
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Posto";

-- OPÇÃO 1: Política simples - permite tudo para usuários autenticados
-- (Recomendado para desenvolvimento/MVP)
CREATE POLICY "Enable all for authenticated users" ON "Posto"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- OU OPÇÃO 2: Políticas mais restritivas (descomente se preferir)
-- CREATE POLICY "Allow authenticated users to read postos" ON "Posto"
--     FOR SELECT
--     USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to insert postos" ON "Posto"
--     FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to update postos" ON "Posto"
--     FOR UPDATE
--     USING (auth.role() = 'authenticated')
--     WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to delete postos" ON "Posto"
--     FOR DELETE
--     USING (auth.role() = 'authenticated');

-- Verifica as políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'Posto';
