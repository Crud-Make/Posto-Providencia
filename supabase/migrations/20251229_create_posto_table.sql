-- Migration: Create Posto table
-- Date: 2025-12-29
-- Description: Adds multi-posto support to the system

-- ============================================
-- TABELA POSTO
-- ============================================

CREATE TABLE IF NOT EXISTS "Posto" (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  endereco TEXT,
  cidade VARCHAR(100),
  estado CHAR(2),
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "Posto" ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all postos
CREATE POLICY "Allow authenticated users to read postos" ON "Posto"
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy for admin to manage postos
CREATE POLICY "Allow admin to manage postos" ON "Posto"
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Inserir postos iniciais
INSERT INTO "Posto" (id, nome, cidade, estado) VALUES 
  (1, 'Posto Providência', 'Jorro', 'BA'),
  (2, 'Posto Jorro 2', 'Jorro', 'BA'),
  (3, 'Posto Jorro 3', 'Jorro', 'BA')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('"Posto"', 'id'), COALESCE((SELECT MAX(id) FROM "Posto"), 1));

COMMENT ON TABLE "Posto" IS 'Tabela de postos de combustível gerenciados pelo sistema';
COMMENT ON COLUMN "Posto".nome IS 'Nome comercial do posto';
COMMENT ON COLUMN "Posto".cnpj IS 'CNPJ do posto (formato: XX.XXX.XXX/XXXX-XX)';
