-- =====================================================
-- FIX: Adiciona política INSERT para tabela Frentista
-- PROBLEMA: Usuários autenticados (admin/gerente) não conseguiam
-- cadastrar novos frentistas devido ao RLS (403 Forbidden).
-- =====================================================

-- 1. Criar política para INSERT
-- Permite que usuários autenticados insiram novos frentistas
-- Se a função user_has_posto_access existir, vamos usá-la para segurança extra
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_posto_access') THEN
        CREATE POLICY "Usuarios autenticados podem inserir frentistas"
        ON public."Frentista"
        FOR INSERT
        TO authenticated
        WITH CHECK (user_has_posto_access(posto_id));
    ELSE
        -- Fallback caso a função ainda não tenha sido aplicada
        CREATE POLICY "Usuarios autenticados podem inserir frentistas"
        ON public."Frentista"
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

COMMENT ON POLICY "Usuarios autenticados podem inserir frentistas" ON public."Frentista" IS 
'Permite que administradores e gerentes cadastrem novos frentistas para seus postos.';
