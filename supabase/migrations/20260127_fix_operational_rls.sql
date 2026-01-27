-- Fix RLS policies for Operational Tables (Leitura, FechamentoFrentista, Recebimento)

-- 1. Helper function (ensure it exists)
CREATE OR REPLACE FUNCTION user_has_posto_access(p_posto_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin Access
  IF EXISTS (
    SELECT 1 FROM "Usuario" 
    WHERE id = auth.uid()::text::integer 
    AND tipo = 'ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Posto Access
  RETURN EXISTS (
    SELECT 1 FROM "UsuarioPosto"
    WHERE usuario_id = auth.uid()::text::integer
    AND posto_id = p_posto_id
    AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Leitura Policies
ALTER TABLE "Leitura" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura select policy" ON "Leitura";
DROP POLICY IF EXISTS "Leitura insert policy" ON "Leitura";
DROP POLICY IF EXISTS "Leitura update policy" ON "Leitura";
DROP POLICY IF EXISTS "Leitura delete policy" ON "Leitura";

CREATE POLICY "Leitura select policy" ON "Leitura" FOR SELECT TO authenticated USING (user_has_posto_access(posto_id));
CREATE POLICY "Leitura insert policy" ON "Leitura" FOR INSERT TO authenticated WITH CHECK (user_has_posto_access(posto_id));
CREATE POLICY "Leitura update policy" ON "Leitura" FOR UPDATE TO authenticated USING (user_has_posto_access(posto_id)) WITH CHECK (user_has_posto_access(posto_id));
CREATE POLICY "Leitura delete policy" ON "Leitura" FOR DELETE TO authenticated USING (user_has_posto_access(posto_id));

-- 3. FechamentoFrentista Policies
ALTER TABLE "FechamentoFrentista" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FechamentoFrentista select policy" ON "FechamentoFrentista";
DROP POLICY IF EXISTS "FechamentoFrentista insert policy" ON "FechamentoFrentista";
DROP POLICY IF EXISTS "FechamentoFrentista update policy" ON "FechamentoFrentista";
DROP POLICY IF EXISTS "FechamentoFrentista delete policy" ON "FechamentoFrentista";

CREATE POLICY "FechamentoFrentista select policy" ON "FechamentoFrentista" FOR SELECT TO authenticated USING (user_has_posto_access(posto_id));
CREATE POLICY "FechamentoFrentista insert policy" ON "FechamentoFrentista" FOR INSERT TO authenticated WITH CHECK (user_has_posto_access(posto_id));
CREATE POLICY "FechamentoFrentista update policy" ON "FechamentoFrentista" FOR UPDATE TO authenticated USING (user_has_posto_access(posto_id)) WITH CHECK (user_has_posto_access(posto_id));
CREATE POLICY "FechamentoFrentista delete policy" ON "FechamentoFrentista" FOR DELETE TO authenticated USING (user_has_posto_access(posto_id));

-- 4. Recebimento Policies (Recebimento doesn't have posto_id directly, links to Fechamento)
ALTER TABLE "Recebimento" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recebimento select policy" ON "Recebimento";
DROP POLICY IF EXISTS "Recebimento insert policy" ON "Recebimento";
DROP POLICY IF EXISTS "Recebimento update policy" ON "Recebimento";
DROP POLICY IF EXISTS "Recebimento delete policy" ON "Recebimento";

CREATE POLICY "Recebimento select policy" ON "Recebimento" FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "Fechamento" f
    WHERE f.id = fechamento_id
    AND user_has_posto_access(f.posto_id)
  )
);

CREATE POLICY "Recebimento insert policy" ON "Recebimento" FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Fechamento" f
    WHERE f.id = fechamento_id
    AND user_has_posto_access(f.posto_id)
  )
);

CREATE POLICY "Recebimento update policy" ON "Recebimento" FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "Fechamento" f
    WHERE f.id = fechamento_id
    AND user_has_posto_access(f.posto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Fechamento" f
    WHERE f.id = fechamento_id
    AND user_has_posto_access(f.posto_id)
  )
);

CREATE POLICY "Recebimento delete policy" ON "Recebimento" FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "Fechamento" f
    WHERE f.id = fechamento_id
    AND user_has_posto_access(f.posto_id)
  )
);
