-- ============================================
-- SCRIPT DE CONFIGURAÇÃO INICIAL
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar coluna user_id na tabela Frentista (se não existir)
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
        
        CREATE INDEX idx_frentista_user_id ON "Frentista"(user_id);
        
        RAISE NOTICE '✅ Coluna user_id criada com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Coluna user_id já existe';
    END IF;
END $$;

-- 2. Verificar frentistas ativos sem vínculo
SELECT 
    id,
    nome,
    cpf,
    telefone,
    ativo
FROM "Frentista"
WHERE user_id IS NULL 
  AND ativo = true
ORDER BY nome;

-- 3. Verificar todos os vínculos existentes
SELECT 
    f.id as frentista_id,
    f.nome as frentista_nome,
    f.cpf,
    f.ativo,
    u.id as user_id,
    u.email as user_email,
    u.created_at
FROM "Frentista" f
LEFT JOIN auth.users u ON f.user_id = u.id
ORDER BY f.nome;

-- ============================================
-- EXEMPLO: Vincular um frentista a um usuário
-- ============================================
-- ATENÇÃO: Substitua os valores antes de executar!

-- Passo 1: Encontre o ID do frentista
-- SELECT id, nome FROM "Frentista" WHERE nome ILIKE '%João%';

-- Passo 2: Crie o usuário no Auth (via painel Supabase > Authentication > Users)
-- Email: joao.frentista@posto.com
-- Password: [senha_temporaria]

-- Passo 3: Pegue o UUID do usuário criado
-- SELECT id, email FROM auth.users WHERE email = 'joao.frentista@posto.com';

-- Passo 4: Vincule o frentista ao usuário
/*
UPDATE "Frentista" 
SET user_id = 'COLE_O_UUID_AQUI'
WHERE id = 1; -- ID do frentista
*/

-- ============================================
-- VERIFICAR FECHAMENTOS
-- ============================================

-- Ver todos os fechamentos de hoje
SELECT 
    f.id,
    f.data,
    f.status,
    t.nome as turno,
    u.email as usuario
FROM "Fechamento" f
LEFT JOIN "Turno" t ON f.turno_id = t.id
LEFT JOIN "Usuario" u ON f.usuario_id = u.id
WHERE f.data = CURRENT_DATE
ORDER BY f."createdAt" DESC;

-- Ver fechamentos de frentistas de hoje
SELECT 
    ff.id,
    fr.nome as frentista,
    ff.valor_cartao,
    ff.valor_nota,
    ff.valor_pix,
    ff.valor_dinheiro,
    (ff.valor_cartao + ff.valor_nota + ff.valor_pix + ff.valor_dinheiro) as total,
    ((ff.valor_cartao + ff.valor_nota + ff.valor_pix + ff.valor_dinheiro) - ff.valor_conferido) as falta_caixa,
    ff.observacoes,
    f.data,
    t.nome as turno
FROM "FechamentoFrentista" ff
JOIN "Frentista" fr ON ff.frentista_id = fr.id
JOIN "Fechamento" f ON ff.fechamento_id = f.id
LEFT JOIN "Turno" t ON f.turno_id = t.id
WHERE f.data = CURRENT_DATE
ORDER BY ff.id DESC;

-- ============================================
-- LIMPEZA (CUIDADO!)
-- ============================================
-- Use apenas em ambiente de desenvolvimento/teste

-- Remover fechamentos de teste de hoje
-- DELETE FROM "FechamentoFrentista" 
-- WHERE fechamento_id IN (
--     SELECT id FROM "Fechamento" WHERE data = CURRENT_DATE
-- );

-- DELETE FROM "Fechamento" WHERE data = CURRENT_DATE;
