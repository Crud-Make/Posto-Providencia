-- Migration: Add posto_id to existing tables
-- Date: 2025-12-29
-- Description: Adds posto_id foreign key to all relevant tables for multi-posto support

-- ============================================
-- ADICIONAR COLUNA posto_id NAS TABELAS
-- ============================================

-- 1. Combustivel - cada posto pode ter preços diferentes
ALTER TABLE "Combustivel" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 2. Bomba - bombas pertencem a um posto
ALTER TABLE "Bomba" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 3. Bico - herda do posto via bomba, mas adicionamos para queries diretas
ALTER TABLE "Bico" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 4. Estoque - cada posto tem seus próprios tanques
ALTER TABLE "Estoque" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 5. Frentista - frentistas trabalham em um posto
ALTER TABLE "Frentista" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 6. Turno - turnos podem variar por posto
ALTER TABLE "Turno" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 7. Leitura - leituras são do posto específico
ALTER TABLE "Leitura" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 8. Fechamento - fechamento é por posto/data
ALTER TABLE "Fechamento" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 9. Compra - compras são para estoque do posto
ALTER TABLE "Compra" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 10. Emprestimo - empréstimos podem ser por posto
ALTER TABLE "Emprestimo" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 11. Despesa - despesas por posto
ALTER TABLE "Despesa" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 12. Fornecedor - fornecedores podem ser compartilhados, mas vinculamos
ALTER TABLE "Fornecedor" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 13. FormaPagamento - formas de pagamento por posto
ALTER TABLE "FormaPagamento" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 14. Maquininha - maquininhas por posto
ALTER TABLE "Maquininha" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 15. Notificacao - notificações por posto
ALTER TABLE "Notificacao" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 16. Produto (estoque de produtos) - por posto
ALTER TABLE "Produto" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 17. MovimentacaoEstoque - por posto
ALTER TABLE "MovimentacaoEstoque" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 18. Configuracao - configurações por posto
ALTER TABLE "Configuracao" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- 19. Divida - dívidas por posto
ALTER TABLE "Divida" 
  ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES "Posto"(id) DEFAULT 1;

-- ============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_combustivel_posto ON "Combustivel"(posto_id);
CREATE INDEX IF NOT EXISTS idx_bomba_posto ON "Bomba"(posto_id);
CREATE INDEX IF NOT EXISTS idx_bico_posto ON "Bico"(posto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_posto ON "Estoque"(posto_id);
CREATE INDEX IF NOT EXISTS idx_frentista_posto ON "Frentista"(posto_id);
CREATE INDEX IF NOT EXISTS idx_turno_posto ON "Turno"(posto_id);
CREATE INDEX IF NOT EXISTS idx_leitura_posto ON "Leitura"(posto_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_posto ON "Fechamento"(posto_id);
CREATE INDEX IF NOT EXISTS idx_compra_posto ON "Compra"(posto_id);
CREATE INDEX IF NOT EXISTS idx_emprestimo_posto ON "Emprestimo"(posto_id);
CREATE INDEX IF NOT EXISTS idx_despesa_posto ON "Despesa"(posto_id);

-- ============================================
-- MIGRAR DADOS EXISTENTES PARA POSTO 1
-- ============================================
-- Todos os dados existentes já terão posto_id = 1 (DEFAULT)
-- devido à cláusula DEFAULT na criação das colunas

-- ============================================
-- TABELA DE ASSOCIAÇÃO: USUARIO -> POSTOS
-- ============================================
-- Um usuário pode ter acesso a múltiplos postos

CREATE TABLE IF NOT EXISTS "UsuarioPosto" (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
  posto_id INTEGER NOT NULL REFERENCES "Posto"(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'operador', -- admin, gerente, operador
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, posto_id)
);

-- Enable RLS
ALTER TABLE "UsuarioPosto" ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Allow authenticated users to read usuario_posto" ON "UsuarioPosto"
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Migrar usuários existentes para ter acesso ao Posto 1
INSERT INTO "UsuarioPosto" (usuario_id, posto_id, role)
SELECT id, 1, role FROM "Usuario"
ON CONFLICT (usuario_id, posto_id) DO NOTHING;

COMMENT ON TABLE "UsuarioPosto" IS 'Tabela de associação entre usuários e postos que podem acessar';
