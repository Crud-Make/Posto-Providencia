-- Fix Fechamento RLS policies
-- O problema: As políticas RLS estão bloqueando INSERT/UPDATE/DELETE na tabela Fechamento
-- Solução: Criar políticas que permitam operações para usuários autenticados do mesmo posto

-- 1. Dropar políticas existentes se houver
DROP POLICY IF EXISTS "Fechamento insert policy" ON "Fechamento";
DROP POLICY IF EXISTS "Fechamento select policy" ON "Fechamento";
DROP POLICY IF EXISTS "Fechamento update policy" ON "Fechamento";
DROP POLICY IF EXISTS "Fechamento delete policy" ON "Fechamento";

-- 2. Criar função helper para verificar acesso ao posto
CREATE OR REPLACE FUNCTION user_has_posto_access(p_posto_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se for admin (tipo = 'ADMIN'), tem acesso a tudo
  IF EXISTS (
    SELECT 1 FROM "Usuario" 
    WHERE id = auth.uid()::text::integer 
    AND tipo = 'ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Caso contrário, verificar se tem acesso ao posto específico
  RETURN EXISTS (
    SELECT 1 FROM "UsuarioPosto"
    WHERE usuario_id = auth.uid()::text::integer
    AND posto_id = p_posto_id
    AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Habilitar RLS
ALTER TABLE "Fechamento" ENABLE ROW LEVEL SECURITY;

-- 4. Criar política para SELECT (leitura)
CREATE POLICY "Fechamento select policy" ON "Fechamento"
  FOR SELECT
  TO authenticated
  USING (user_has_posto_access(posto_id));

-- 5. Criar política para INSERT (criação)
CREATE POLICY "Fechamento insert policy" ON "Fechamento"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_posto_access(posto_id) AND
    usuario_id = auth.uid()::text::integer
  );

-- 6. Criar política para UPDATE (atualização)
CREATE POLICY "Fechamento update policy" ON "Fechamento"
  FOR UPDATE
  TO authenticated
  USING (user_has_posto_access(posto_id))
  WITH CHECK (user_has_posto_access(posto_id));

-- 7. Criar política para DELETE (exclusão - apenas admin)
CREATE POLICY "Fechamento delete policy" ON "Fechamento"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Usuario" 
      WHERE id = auth.uid()::text::integer 
      AND tipo = 'ADMIN'
    )
  );

-- Comentários explicativos
COMMENT ON POLICY "Fechamento select policy" ON "Fechamento" IS 
  'Permite SELECT para usuários autenticados que têm acesso ao posto';

COMMENT ON POLICY "Fechamento insert policy" ON "Fechamento" IS 
  'Permite INSERT para usuários autenticados que têm acesso ao posto e são donos do registro';

COMMENT ON POLICY "Fechamento update policy" ON "Fechamento" IS 
  'Permite UPDATE para usuários autenticados que têm acesso ao posto';

COMMENT ON POLICY "Fechamento delete policy" ON "Fechamento" IS 
  'Permite DELETE apenas para administradores';
