-- Corrige permissões RLS para tabelas Cliente e NotaFrentista

-- Remove políticas anteriores para evitar conflitos
DROP POLICY IF EXISTS "Allow authenticated access cliente" ON public."Cliente";
DROP POLICY IF EXISTS "Allow authenticated access nota" ON public."NotaFrentista";

-- Política para Cliente
CREATE POLICY "Enable all for authenticated users on Cliente"
ON public."Cliente"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para NotaFrentista
CREATE POLICY "Enable all for authenticated users on NotaFrentista"
ON public."NotaFrentista"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
