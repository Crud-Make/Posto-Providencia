-- =====================================================
-- FIX: Adiciona política UPDATE para admins na tabela Frentista
-- O problema: A política UPDATE existente só permite que o próprio
-- frentista atualize seu perfil (user_id = auth.uid()).
-- Precisamos permitir que admins (usuários autenticados) também atualizem.
-- =====================================================

-- Remover política antiga que era restritiva demais
DROP POLICY IF EXISTS "Frentistas can update own profile" ON public."Frentista";

-- Criar política que permite qualquer usuário autenticado atualizar frentistas
-- (necessário para o admin desativar/editar frentistas no dashboard)
CREATE POLICY "Usuarios autenticados podem atualizar frentistas"
ON public."Frentista"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
