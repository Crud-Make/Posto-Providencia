-- Script para habilitar inserção na tabela Frentista via app mobile
-- Execute isso no SQL Editor do Supabase Dashboard

-- Opção 1: Permitir que usuários autenticados insiram seu próprio registro
CREATE POLICY "Usuários podem criar seu próprio perfil de frentista"
ON "Frentista"
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Opção 2: Se a tabela não tiver RLS ou você quiser desabilitar temporariamente
-- ALTER TABLE "Frentista" DISABLE ROW LEVEL SECURITY;

-- Opção 3: Permitir inserção para qualquer usuário autenticado (menos restritivo)
-- CREATE POLICY "Usuários autenticados podem inserir frentistas"
-- ON "Frentista"
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
