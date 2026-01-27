-- ============================================
-- SCRIPT PARA CRIAR FRENTESTAS DE EXEMPLO
-- ============================================
-- Este script cria frentistas de exemplo para o Posto Providência (ID: 1)
-- Execute no SQL Editor do Supabase

DO $$
BEGIN
  -- Verificar se já existem frentistas ativos
  IF EXISTS (SELECT 1 FROM "Frentista" WHERE posto_id = 1 AND ativo = true LIMIT 1) THEN
    RAISE NOTICE 'Já existem frentistas ativos para o Posto Providência. Nenhum frentista será criado.';
  ELSE
    -- Criar frentistas de exemplo
    INSERT INTO "Frentista" (nome, cpf, telefone, ativo, data_admissao, posto_id) VALUES
      ('João Silva', '123.456.789-00', '(11) 98765-4321', true, '2024-01-15', 1),
      ('Maria Santos', '234.567.890-11', '(21) 98765-4322', true, '2024-02-01', 1),
      ('Pedro Oliveira', '345.678.901-22', '(31) 98765-4323', true, '2024-03-10', 1),
      ('Ana Costa', '456.789.012-33', '(41) 98765-4324', true, '2024-04-20', 1),
      ('Carlos Rodrigues', '567.890.123-44', '(51) 98765-4325', true, '2024-05-05', 1);

    RAISE NOTICE '✓ 5 frentistas de exemplo criados com sucesso!';
  END IF;
END $$;

-- Listar frentistas criados
SELECT 
  id,
  nome,
  cpf,
  telefone,
  ativo,
  data_admissao,
  posto_id
FROM "Frentista"
WHERE posto_id = 1
ORDER BY nome;
