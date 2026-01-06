-- ============================================
-- SCRIPT PARA ZERAR DADOS DA VISÃO DO PROPRIETÁRIO
-- ============================================
-- Este script remove todos os dados de teste mantendo a estrutura do banco
-- Execute no SQL Editor do Supabase

-- ATENÇÃO: Este script irá deletar dados! Use com cuidado!
-- Recomenda-se fazer backup antes de executar

BEGIN;

-- 1. Deletar Fechamentos (vendas diárias)
DELETE FROM "Fechamento";
RAISE NOTICE 'Fechamentos deletados';

-- 2. Deletar Dívidas
DELETE FROM "Divida";
RAISE NOTICE 'Dívidas deletadas';

-- 3. Deletar Empréstimos
DELETE FROM "Emprestimo";
RAISE NOTICE 'Empréstimos deletados';

-- 4. Deletar Despesas
DELETE FROM "Despesa";
RAISE NOTICE 'Despesas deletadas';

-- 5. Deletar Vendas (se existir tabela de vendas individuais)
DELETE FROM "Venda" WHERE TRUE;
RAISE NOTICE 'Vendas deletadas (se existir)';

-- 6. Deletar Fechamentos de Frentista
DELETE FROM "FechamentoFrentista";
RAISE NOTICE 'Fechamentos de Frentista deletados';

-- 7. Resetar preços de custo dos combustíveis (opcional)
-- Descomente se quiser zerar os preços de custo
-- UPDATE "Combustivel" SET preco_custo = 0;
-- RAISE NOTICE 'Preços de custo resetados';

-- Verificar contagens após limpeza
DO $$
DECLARE
    fechamentos_count INTEGER;
    dividas_count INTEGER;
    emprestimos_count INTEGER;
    despesas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fechamentos_count FROM "Fechamento";
    SELECT COUNT(*) INTO dividas_count FROM "Divida";
    SELECT COUNT(*) INTO emprestimos_count FROM "Emprestimo";
    SELECT COUNT(*) INTO despesas_count FROM "Despesa";
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'RESUMO DA LIMPEZA:';
    RAISE NOTICE 'Fechamentos restantes: %', fechamentos_count;
    RAISE NOTICE 'Dívidas restantes: %', dividas_count;
    RAISE NOTICE 'Empréstimos restantes: %', emprestimos_count;
    RAISE NOTICE 'Despesas restantes: %', despesas_count;
    RAISE NOTICE '===========================================';
END $$;

COMMIT;

-- Mensagem final
SELECT 'Dados da Visão do Proprietário foram zerados com sucesso!' as status;
