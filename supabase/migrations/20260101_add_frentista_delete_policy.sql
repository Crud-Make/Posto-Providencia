-- =====================================================
-- FIX: Adiciona política DELETE para tabela Frentista
-- Permite que usuários autenticados (admin do posto) deletem frentistas
-- =====================================================

CREATE POLICY "Usuarios autenticados podem deletar frentistas"
ON public."Frentista"
FOR DELETE
TO authenticated
USING (true);
