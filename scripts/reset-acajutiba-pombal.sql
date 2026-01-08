-- ============================================
-- Script para Resetar Dados dos Postos:
-- - POSTO-ACAJUTIBA (ID 3)
-- - Posto Ribeira do Pombal (ID 4)
-- ============================================
-- ATENÇÃO: Este script remove TODOS os dados transacionais desses postos
-- Execute no SQL Editor do Supabase
-- ============================================

-- Primeiro, vamos verificar os IDs dos postos
SELECT id, nome FROM "Posto" WHERE nome LIKE '%Acajutiba%' OR nome LIKE '%Pombal%';

-- ============================================
-- DELETAR DADOS TRANSACIONAIS
-- ============================================

-- 1. Deletar Recebimentos (relacionados a fechamentos)
DELETE FROM "Recebimento" 
WHERE posto_id IN (3, 4);

-- 2. Deletar FechamentoFrentista
DELETE FROM "FechamentoFrentista" 
WHERE posto_id IN (3, 4);

-- 3. Deletar Fechamentos
DELETE FROM "Fechamento" 
WHERE posto_id IN (3, 4);

-- 4. Deletar Leituras (vendas)
DELETE FROM "Leitura" 
WHERE posto_id IN (3, 4);

-- 5. Deletar Notas de Frentista
DELETE FROM "NotaFrentista" 
WHERE posto_id IN (3, 4);

-- 6. Deletar Parcelas de Empréstimos
DELETE FROM "Parcela" 
WHERE emprestimo_id IN (
    SELECT id FROM "Emprestimo" WHERE posto_id IN (3, 4)
);

-- 7. Deletar Empréstimos
DELETE FROM "Emprestimo" 
WHERE posto_id IN (3, 4);

-- 8. Deletar Dívidas
DELETE FROM "Divida" 
WHERE posto_id IN (3, 4);

-- 9. Deletar Despesas
DELETE FROM "Despesa" 
WHERE posto_id IN (3, 4);

-- 10. Deletar Compras
DELETE FROM "Compra" 
WHERE posto_id IN (3, 4);

-- 11. Deletar Histórico de Tanques
DELETE FROM "HistoricoTanque"
WHERE tanque_id IN (
    SELECT id FROM "Tanque" WHERE posto_id IN (3, 4)
);

-- 12. Resetar Estoque para zero
UPDATE "Estoque" 
SET quantidade_atual = 0, custo_medio = 0
WHERE posto_id IN (3, 4);

-- 13. Resetar saldo devedor dos clientes
UPDATE "Cliente" 
SET saldo_devedor = 0
WHERE posto_id IN (3, 4);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar contagem de registros restantes por tabela
SELECT 
    'Leitura' as tabela, 
    COUNT(*) as total_posto_3,
    (SELECT COUNT(*) FROM "Leitura" WHERE posto_id = 4) as total_posto_4
FROM "Leitura" WHERE posto_id = 3
UNION ALL
SELECT 
    'Fechamento', 
    COUNT(*),
    (SELECT COUNT(*) FROM "Fechamento" WHERE posto_id = 4)
FROM "Fechamento" WHERE posto_id = 3
UNION ALL
SELECT 
    'NotaFrentista', 
    COUNT(*),
    (SELECT COUNT(*) FROM "NotaFrentista" WHERE posto_id = 4)
FROM "NotaFrentista" WHERE posto_id = 3
UNION ALL
SELECT 
    'Compra', 
    COUNT(*),
    (SELECT COUNT(*) FROM "Compra" WHERE posto_id = 4)
FROM "Compra" WHERE posto_id = 3
UNION ALL
SELECT 
    'Despesa', 
    COUNT(*),
    (SELECT COUNT(*) FROM "Despesa" WHERE posto_id = 4)
FROM "Despesa" WHERE posto_id = 3
UNION ALL
SELECT 
    'Divida', 
    COUNT(*),
    (SELECT COUNT(*) FROM "Divida" WHERE posto_id = 4)
FROM "Divida" WHERE posto_id = 3
UNION ALL
SELECT 
    'Emprestimo', 
    COUNT(*),
    (SELECT COUNT(*) FROM "Emprestimo" WHERE posto_id = 4)
FROM "Emprestimo" WHERE posto_id = 3;

-- ============================================
-- SUCESSO!
-- ============================================
-- Os postos Acajutiba e Ribeira do Pombal foram resetados
-- Mantendo apenas as configurações básicas (combustíveis, bombas, bicos, etc)
-- ============================================
