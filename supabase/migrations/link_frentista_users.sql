-- ============================================
-- SQL: Vincular Usuários aos Frentistas
-- ============================================
-- Este script adiciona uma coluna user_id na tabela Frentista
-- para vincular cada frentista a um usuário autenticado

-- 1. Adicionar coluna user_id (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Frentista' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "Frentista" 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        -- Criar índice para melhor performance
        CREATE INDEX idx_frentista_user_id ON "Frentista"(user_id);
    END IF;
END $$;

-- 2. Exemplo de como vincular um frentista a um usuário:
-- (Execute este comando para cada frentista após criar o usuário correspondente)
/*
UPDATE "Frentista" 
SET user_id = 'UUID_DO_USUARIO_AQUI'
WHERE id = 1; -- ID do frentista
*/

-- 3. Para listar frentistas sem usuário vinculado:
SELECT id, nome, cpf, ativo
FROM "Frentista"
WHERE user_id IS NULL AND ativo = true;

-- 4. Para verificar vínculos existentes:
SELECT 
    f.id,
    f.nome as frentista_nome,
    f.cpf,
    u.email as usuario_email,
    f.user_id
FROM "Frentista" f
LEFT JOIN auth.users u ON f.user_id = u.id
WHERE f.ativo = true
ORDER BY f.nome;
