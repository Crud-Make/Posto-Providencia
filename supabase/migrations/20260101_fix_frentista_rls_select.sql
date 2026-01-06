-- =====================================================
-- FIX: Adiciona política SELECT para tabela Frentista
-- 
-- PROBLEMA: RLS estava habilitado mas não havia política SELECT,
-- então ninguém conseguia ver os frentistas no dashboard web.
-- Contas criadas no app mobile ficavam "invisíveis" no web.
--
-- SOLUÇÃO: Adicionar políticas SELECT para authenticated e anon
-- =====================================================

-- 1. Permitir que usuários autenticados vejam todos os frentistas
-- (necessário para o dashboard web listar todos os frentistas do posto)
CREATE POLICY "Usuarios autenticados podem ver frentistas"
ON public."Frentista"
FOR SELECT
TO authenticated
USING (true);

-- 2. Também permite acesso de leitura para usuários anônimos (app mobile sem login inicial)
-- caso seja necessário para algumas funcionalidades públicas
CREATE POLICY "Acesso publico de leitura aos frentistas"
ON public."Frentista"
FOR SELECT
TO anon
USING (true);
