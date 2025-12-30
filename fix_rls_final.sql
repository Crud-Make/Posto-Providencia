-- Reset completo de RLS para Cliente e NotaFrentista
-- Divide as permissões em políticas granulares para garantir funcionamento de INSERT

-- =========================================================
-- TABELA CLIENTE
-- =========================================================
ALTER TABLE public."Cliente" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cliente" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users on Cliente" ON public."Cliente";
DROP POLICY IF EXISTS "Allow authenticated access cliente" ON public."Cliente";

-- Select (Leitura)
CREATE POLICY "Enable SELECT for authenticated users on Cliente"
ON public."Cliente" FOR SELECT TO authenticated
USING (true);

-- Insert (Criação)
CREATE POLICY "Enable INSERT for authenticated users on Cliente"
ON public."Cliente" FOR INSERT TO authenticated
WITH CHECK (true);

-- Update (Edição)
CREATE POLICY "Enable UPDATE for authenticated users on Cliente"
ON public."Cliente" FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Delete (Exclusão)
CREATE POLICY "Enable DELETE for authenticated users on Cliente"
ON public."Cliente" FOR DELETE TO authenticated
USING (true);


-- =========================================================
-- TABELA NOTAFRENTISTA
-- =========================================================
ALTER TABLE public."NotaFrentista" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotaFrentista" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users on NotaFrentista" ON public."NotaFrentista";
DROP POLICY IF EXISTS "Allow authenticated access nota" ON public."NotaFrentista";

-- Select (Leitura)
CREATE POLICY "Enable SELECT for authenticated users on NotaFrentista"
ON public."NotaFrentista" FOR SELECT TO authenticated
USING (true);

-- Insert (Criação)
CREATE POLICY "Enable INSERT for authenticated users on NotaFrentista"
ON public."NotaFrentista" FOR INSERT TO authenticated
WITH CHECK (true);

-- Update (Edição)
CREATE POLICY "Enable UPDATE for authenticated users on NotaFrentista"
ON public."NotaFrentista" FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Delete (Exclusão)
CREATE POLICY "Enable DELETE for authenticated users on NotaFrentista"
ON public."NotaFrentista" FOR DELETE TO authenticated
USING (true);
