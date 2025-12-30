-- ============================================
-- CORREÇÃO DE RLS PARA TABELA CLIENTE
-- Execute este script no SQL Editor do Supabase para corrigir o erro 401
-- ============================================

-- Habilitar RLS se não estiver
ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (limpeza)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Cliente";
DROP POLICY IF EXISTS "Allow read for authenticated" ON "Cliente";
DROP POLICY IF EXISTS "Allow insert for authenticated" ON "Cliente";
DROP POLICY IF EXISTS "Allow update for authenticated" ON "Cliente";

-- Cria política permissiva para usuários autenticados
-- Permite que qualquer usuário logado (frentista ou gestor) leia e gerencie clientes
CREATE POLICY "Enable all for authenticated users" ON "Cliente"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Repetir para NotaFrentista para garantir que notas funcionem também
ALTER TABLE "NotaFrentista" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON "NotaFrentista";

CREATE POLICY "Enable all for authenticated users" ON "NotaFrentista"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
