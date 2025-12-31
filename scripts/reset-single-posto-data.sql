-- ============================================
-- SCRIPT PARA ZERAR DADOS DE UM POSTO ESPECÍFICO
-- ============================================
-- Este script remove dados de teste de um posto específico
-- Execute no SQL Editor do Supabase

-- CONFIGURAÇÃO: Altere o posto_id conforme necessário
-- posto_id = 1 (Posto Providência)
-- posto_id = 2 (Posto Ribeira do Pombal)
-- posto_id = 3 (Posto Acajutiba)

DO $$
DECLARE
    target_posto_id INTEGER := 1; -- ALTERE AQUI O ID DO POSTO
    posto_nome TEXT;
BEGIN
    -- Buscar nome do posto
    SELECT nome INTO posto_nome FROM "Posto" WHERE id = target_posto_id;
    
    IF posto_nome IS NULL THEN
        RAISE EXCEPTION 'Posto com ID % não encontrado!', target_posto_id;
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Limpando dados do posto: % (ID: %)', posto_nome, target_posto_id;
    RAISE NOTICE '===========================================';
    
    -- 1. Deletar Fechamentos
    DELETE FROM "Fechamento" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Fechamentos deletados';
    
    -- 2. Deletar Dívidas
    DELETE FROM "Divida" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Dívidas deletadas';
    
    -- 3. Deletar Empréstimos
    DELETE FROM "Emprestimo" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Empréstimos deletados';
    
    -- 4. Deletar Despesas
    DELETE FROM "Despesa" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Despesas deletadas';
    
    -- 5. Deletar Vendas (se existir)
    DELETE FROM "Venda" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Vendas deletadas';
    
    -- 6. Deletar Fechamentos de Frentista
    DELETE FROM "FechamentoFrentista" WHERE posto_id = target_posto_id;
    RAISE NOTICE '✓ Fechamentos de Frentista deletados';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Limpeza concluída para: %', posto_nome;
    RAISE NOTICE '===========================================';
END $$;
